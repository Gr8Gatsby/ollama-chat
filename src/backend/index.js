import { WebSocketServer } from "ws";
import { createServer } from "http";
import { randomUUID } from "crypto";
import { initDatabase, closeDatabase } from "./db/init.js";

const PORT = process.env.PORT || 8080;
const DB_PATH = process.env.DB_PATH || "/data/ollama-chat.db";
const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://ollama:11434";

// Initialize database
let db;
try {
  db = initDatabase(DB_PATH);
} catch (err) {
  console.error("[ERROR] Failed to initialize database:", err);
  process.exit(1);
}

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

const PREVIEW_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function sendJson(res, status, payload) {
  res.writeHead(status, JSON_HEADERS);
  res.end(JSON.stringify(payload));
}

function contentTypeForPath(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".html")) return "text/html; charset=utf-8";
  if (lower.endsWith(".css")) return "text/css; charset=utf-8";
  if (lower.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  if (lower.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "text/plain; charset=utf-8";
}

function sanitizePreviewPath(path) {
  const cleaned = path.replace(/^\/+/, "");
  if (!cleaned || cleaned.includes("..")) return "";
  return cleaned;
}

function getPreviewEntry(projectId) {
  const manifest = getProjectFile(projectId, "project.manifest.json");
  if (!manifest?.content) return "index.html";
  try {
    const parsed = JSON.parse(manifest.content);
    return parsed?.preview?.entry || "index.html";
  } catch (error) {
    return "index.html";
  }
}

function normalizePreviewHtml(projectId, html, filePaths = []) {
  if (!html) return "";
  const baseTag = `<base href="/api/projects/${projectId}/preview/">`;
  const importMap = `<script type="importmap">{"imports":{"src/":"./src/"}}</script>`;
  const proxyScript = `<script>
(() => {
  const originalFetch = window.fetch;
  const isAbsolute = (url) => /^https?:\\/\\//i.test(url);
  const shouldProxy = (url) => {
    try {
      const parsed = new URL(url, window.location.origin);
      return parsed.origin !== window.location.origin;
    } catch {
      return false;
    }
  };
  window.fetch = (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    if (url && isAbsolute(url) && shouldProxy(url)) {
      const proxied = \`/api/proxy?url=\${encodeURIComponent(url)}\`;
      return originalFetch(proxied, init);
    }
    return originalFetch(input, init);
  };
})();
</script>`;
  const errorScript = `<script>
(() => {
  const postError = (payload) => {
    try {
      window.parent?.postMessage({ type: "ollama.preview.error", payload }, "*");
    } catch {}
  };
  window.addEventListener("error", (event) => {
    const target = event.target;
    if (target?.tagName === "SCRIPT" || target?.tagName === "LINK") {
      const url = target.src || target.href || "unknown";
      postError({ kind: "resource", message: "Failed to load resource", url });
      return;
    }
    postError({
      kind: "error",
      message: event.message || "Script error",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    postError({
      kind: "promise",
      message: event.reason?.message || String(event.reason || "Unhandled rejection"),
    });
  });
})();
</script>`;
  let output = html;
  const hasFetchWrapper = output.includes("window.fetch =");
  if (!/<base\s/i.test(output)) {
    output = output.replace(
      /<head([^>]*)>/i,
      (match) =>
        `${match}\n    ${baseTag}\n    ${importMap}\n    ${proxyScript}\n    ${errorScript}`,
    );
  } else {
    if (!hasFetchWrapper) {
      output = output.replace(
        /<head([^>]*)>/i,
        (match) => `${match}\n    ${proxyScript}`,
      );
    }
    output = output.replace(
      /<head([^>]*)>/i,
      (match) => `${match}\n    ${errorScript}`,
    );
  }
  const fileSet = new Set(filePaths);
  const fallbackMap = {
    "main.js": "src/main.js",
    "app.js": "src/main.js",
    "style.css": "styles.css",
  };
  output = output.replace(
    /(src|href)=["']([^"']+)["']/gi,
    (match, attr, rawPath) => {
      if (!rawPath || /^(https?:|data:|mailto:|tel:|#)/i.test(rawPath)) {
        return match;
      }
      if (rawPath.startsWith("/api/")) {
        return match;
      }
      let normalized = rawPath.replace(/^\/+/, "");
      if (fileSet.size) {
        if (!fileSet.has(normalized)) {
          if (fallbackMap[normalized] && fileSet.has(fallbackMap[normalized])) {
            normalized = fallbackMap[normalized];
          } else if (!normalized.includes("/")) {
            const candidates = filePaths.filter((p) =>
              p.endsWith(`/${normalized}`),
            );
            if (candidates.length === 1) {
              normalized = candidates[0];
            }
          }
        }
      }
      return `${attr}="${normalized}"`;
    },
  );
  return output;
}

function normalizePreviewJs(js) {
  if (!js) return "";
  return js
    .replace(
      /(from\s+["'])(src\/[^"']+)(["'])/g,
      (_match, prefix, spec, suffix) => `${prefix}./${spec}${suffix}`,
    )
    .replace(
      /(import\s+["'])(src\/[^"']+)(["'])/g,
      (_match, prefix, spec, suffix) => `${prefix}./${spec}${suffix}`,
    )
    .replace(
      /(import\(\s*["'])(src\/[^"']+)(["']\s*\))/g,
      (_match, prefix, spec, suffix) => `${prefix}./${spec}${suffix}`,
    );
}

async function proxyRequest(res, targetUrl) {
  let url;
  try {
    url = new URL(targetUrl);
  } catch {
    res.writeHead(400, PREVIEW_HEADERS);
    res.end("Invalid URL");
    return;
  }
  if (!["http:", "https:"].includes(url.protocol)) {
    res.writeHead(400, PREVIEW_HEADERS);
    res.end("Unsupported protocol");
    return;
  }
  try {
    const response = await fetch(url.toString(), { method: "GET" });
    const contentType = response.headers.get("content-type") || "text/plain";
    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
      ...PREVIEW_HEADERS,
      "Content-Type": contentType,
    });
    res.end(body);
  } catch (error) {
    res.writeHead(502, PREVIEW_HEADERS);
    res.end("Proxy request failed");
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendNdjson(res, payload) {
  res.write(`${JSON.stringify(payload)}\n`);
}

async function* readNdjsonStream(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let chunkCount = 0;
  let totalBytes = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      console.log(
        `[readNdjsonStream] Stream ended after ${chunkCount} chunks, ${totalBytes} bytes`,
      );
      break;
    }

    chunkCount++;
    totalBytes += value.length;
    const decoded = decoder.decode(value, { stream: true });

    if (chunkCount <= 3) {
      console.log(
        `[readNdjsonStream] Chunk ${chunkCount}: ${decoded.substring(0, 200)}`,
      );
    }

    buffer += decoded;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = JSON.parse(trimmed);

      if (chunkCount <= 3) {
        console.log(`[readNdjsonStream] Yielding:`, parsed);
      }

      yield parsed;
    }
  }

  const remaining = buffer.trim();
  if (remaining) {
    console.log(
      `[readNdjsonStream] Yielding remaining:`,
      remaining.substring(0, 100),
    );
    yield JSON.parse(remaining);
  }
}

async function isModelAvailable(model) {
  try {
    const response = await fetch(`${OLLAMA_HOST}/api/tags`);
    if (!response.ok) return false;
    const data = await response.json();
    const models = Array.isArray(data.models) ? data.models : [];
    return models.some((entry) => entry.name === model);
  } catch {
    return false;
  }
}

function buildOrchestrationSystemPrompt({
  requireScaffold,
  requireFiles,
  projectContext,
}) {
  const base = `You are building a no-build web project that runs directly in the browser.

Output ONLY files using the exact format:
File: path/to/file.ext
\`\`\`language
...file content...
\`\`\`

ARCHITECTURE REQUIREMENTS:
- Do not output React, Vite, Tailwind, or build tooling
- Use index.html as the entrypoint
- Create SEPARATE component files in src/components/ directory
- Each component should be a Web Component (custom element) in its own file
- Use ES modules - components import from other components
- src/app.js should be minimal - just imports and initializes components
- Example structure:
  - index.html (imports src/app.js)
  - styles.css (global styles and CSS variables)
  - src/app.js (imports and registers components)
  - src/components/todo-list.js (Web Component)
  - src/components/todo-item.js (Web Component)
  - src/components/add-todo.js (Web Component)`;

  const requirements = [];
  if (requireFiles) {
    requirements.push("You MUST output at least one File: block.");
  }
  if (projectContext) {
    requirements.push(projectContext);
  }
  const requirementsBlock = requirements.length
    ? `\n\n${requirements.join("\n")}`
    : "";

  if (!requireScaffold) {
    return `${base}${requirementsBlock}`;
  }

  return `${base}${requirementsBlock}

This is a new project. You MUST include:
- index.html (loads src/app.js as ES module)
- styles.css (global styles and CSS variables)
- src/app.js (minimal - imports and registers components)
- At least one component in src/components/ (e.g., src/components/main-app.js)

IMPORTANT: Break functionality into SEPARATE component files, not one monolithic app.js`;
}

function buildProjectContextSummary(projectId, requestedFiles = []) {
  const files = listProjectFiles(projectId);
  if (!files.length) return "No project files yet.";
  const maxFiles = 20;

  // If specific files were requested, include their full contents
  if (Array.isArray(requestedFiles) && requestedFiles.length > 0) {
    const fullFiles = requestedFiles
      .map((requestedPath) => {
        const file = files.find((f) => f.path === requestedPath);
        if (!file) return null;
        const fileContent = getProjectFile(projectId, file.path)?.content || "";
        return `File: ${file.path}\n\`\`\`${file.language || "text"}\n${fileContent}\n\`\`\``;
      })
      .filter(Boolean);

    const summaries = files
      .slice(0, maxFiles)
      .map((file) => {
        if (requestedFiles.includes(file.path)) return null; // Skip files already shown in full
        let summary = "";
        const fileContent = getProjectFile(projectId, file.path)?.content || "";
        const firstLine =
          fileContent
            .split("\n")
            .map((line) => line.trim())
            .find((line) => line) || "";
        if (firstLine) {
          summary = ` - ${firstLine.slice(0, 80)}`;
        }
        return `- ${file.path} (${file.language || "text"}, ${file.size || 0} bytes)${summary}`;
      })
      .filter(Boolean);

    return `Current project files:\n\n${fullFiles.join("\n\n")}\n\nOther files:\n${summaries.join("\n")}`;
  }

  // Default: just show file list with first line summary
  const summaries = files.slice(0, maxFiles).map((file) => {
    let summary = "";
    const fileContent = getProjectFile(projectId, file.path)?.content || "";
    const firstLine =
      fileContent
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line) || "";
    if (firstLine) {
      summary = ` - ${firstLine.slice(0, 80)}`;
    }
    return `- ${file.path} (${file.language || "text"}, ${file.size || 0} bytes)${summary}`;
  });
  return `Project files:\n${summaries.join("\n")}`;
}

function shouldRequireFiles(messages = []) {
  const lastUser = [...messages].reverse().find((msg) => msg.role === "user");
  const text = lastUser?.content?.toLowerCase() || "";
  if (!text) return false;

  // Check if this is an informational/question query (not a file generation request)
  const questionPatterns = [
    /^what\s+(have|did|is|are|does)/,
    /^how\s+(does|do|did|is|are)/,
    /^why\s+(is|are|does|do|did)/,
    /^explain/,
    /^tell me/,
    /^show me\s+(what|how)/,
    /^can you (explain|tell|show)/,
    /what.*built.*so far/,
    /what.*created/,
    /what.*made/,
  ];

  // If it's a question about the project state, don't require files
  if (questionPatterns.some((pattern) => pattern.test(text))) {
    return false;
  }

  // Action keywords that indicate file generation is needed
  const actionKeywords = [
    "create",
    "build",
    "update",
    "fix",
    "add",
    "edit",
    "implement",
    "change",
    "refactor",
    "generate",
    "write",
    "make a",
    "make an",
  ];

  return (
    actionKeywords.some((word) => text.includes(word)) ||
    /\.(js|css|html|md|json)\b/.test(text)
  );
}

async function requestFileContents({
  model,
  projectContext,
  userRequest,
  hasUserFiles,
}) {
  if (!hasUserFiles) return []; // No files to request

  const systemPrompt = `You are analyzing which files need to be viewed to complete a user request.
Return a JSON array of file paths that you need to see the full contents of.
Rules:
- Output ONLY valid JSON array of strings (no markdown, no explanation).
- Only request files that are ESSENTIAL to understand before making changes.
- Maximum 5 files.
- If you can complete the task with just the file list summary, return an empty array [].`;

  const userPrompt = `${projectContext}\n\nUser request: ${userRequest}\n\nWhich files do you need to see the full contents of? Return a JSON array of file paths, or [] if none needed.`;

  try {
    const stream = await generateChatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    let content = "";
    for await (const chunk of stream) {
      content += chunk?.message?.content ?? chunk?.response ?? "";
    }
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed.slice(0, 5).map(String) : [];
  } catch (error) {
    console.warn("[requestFileContents] Failed:", error.message);
    return [];
  }
}

async function generatePlan({ model, projectContext, requireScaffold }) {
  const systemPrompt = `You are a planner. Return a JSON array of concise steps.
Rules:
- Output ONLY valid JSON (no markdown).
- Each step must be a short string.
- 3 to 6 steps total.
- Include file names when applicable.`;
  const userPrompt = `Project context:\n${projectContext}\n\nNew project: ${
    requireScaffold ? "yes" : "no"
  }\nReturn steps for updating the project based on the user request.`;
  try {
    const stream = await generateChatCompletion({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    let content = "";
    for await (const chunk of stream) {
      content += chunk?.message?.content ?? chunk?.response ?? "";
    }
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, 6).map((step, index) => ({
        id: `step-${index + 1}`,
        label: String(step),
        done: false,
      }));
    }
  } catch (error) {
    console.warn("[backend] Plan generation failed:", error);
  }
  const fallback = requireScaffold
    ? ["Create index.html", "Create styles.css", "Create src/app.js"]
    : ["Inspect existing files", "Update relevant files", "Verify output"];
  return fallback.map((step, index) => ({
    id: `step-${index + 1}`,
    label: step,
    done: false,
  }));
}

function validateFilePath(path) {
  if (!path || typeof path !== "string") {
    return { ok: false, reason: "Path is required and must be a string" };
  }

  const trimmedPath = path.trim();

  // Reject empty paths
  if (trimmedPath.length === 0) {
    return { ok: false, reason: "Path cannot be empty" };
  }

  // Reject absolute paths
  if (trimmedPath.startsWith("/") || /^[a-zA-Z]:/.test(trimmedPath)) {
    return { ok: false, reason: "Absolute paths are not allowed" };
  }

  // Reject path traversal attempts
  if (trimmedPath.includes("..")) {
    return { ok: false, reason: "Path traversal (..) is not allowed" };
  }

  // Reject hidden system files (except project.* files)
  const fileName = trimmedPath.split("/").pop();
  if (fileName.startsWith(".") && !fileName.startsWith("project.")) {
    return { ok: false, reason: "Hidden files are not allowed" };
  }

  // Reject suspicious characters
  if (/[<>"|?*\x00-\x1f]/.test(trimmedPath)) {
    return { ok: false, reason: "Path contains invalid characters" };
  }

  // Normalize path separators
  const normalizedPath = trimmedPath.replace(/\\/g, "/");

  return { ok: true, normalizedPath };
}

function validateFileContent(file) {
  const { path, content, language } = file;

  // Validate path first
  const pathValidation = validateFilePath(path);
  if (!pathValidation.ok) {
    return pathValidation;
  }

  // Check minimum content length
  const trimmedContent = content.trim();
  if (trimmedContent.length < 10) {
    return { ok: false, reason: "Content too short (minimum 10 characters)" };
  }

  // Check for obvious placeholders indicating incomplete code (not just TODO comments)
  // Only reject if placeholder appears as standalone statement, not in a comment
  const placeholderPatterns = [
    /^\s*PLACEHOLDER\s*$/im, // Standalone PLACEHOLDER line
    /^\s*TBD\s*$/im, // Standalone TBD line
    /TODO:\s*implement/i, // "TODO: implement" suggests incomplete
    /FIXME:\s*implement/i, // "FIXME: implement" suggests incomplete
    /^\s*\.\.\.+\s*$/m, // Standalone ellipsis (...)
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      return {
        ok: false,
        reason: `Contains obvious placeholder pattern: ${pattern}`,
      };
    }
  }

  // Check for balanced braces/brackets (basic structural check)
  const openBraces = (content.match(/\{/g) || []).length;
  const closeBraces = (content.match(/\}/g) || []).length;
  const openBrackets = (content.match(/\[/g) || []).length;
  const closeBrackets = (content.match(/\]/g) || []).length;
  const openParens = (content.match(/\(/g) || []).length;
  const closeParens = (content.match(/\)/g) || []).length;

  // Allow some tolerance for comments or strings
  if (
    Math.abs(openBraces - closeBraces) > 3 ||
    Math.abs(openBrackets - closeBrackets) > 3 ||
    Math.abs(openParens - closeParens) > 5
  ) {
    return { ok: false, reason: "Unbalanced braces/brackets/parentheses" };
  }

  // JavaScript/TypeScript syntax validation
  if (
    language === "javascript" ||
    language === "js" ||
    language === "typescript" ||
    language === "ts" ||
    path.endsWith(".js") ||
    path.endsWith(".ts") ||
    path.endsWith(".jsx") ||
    path.endsWith(".tsx")
  ) {
    // Skip syntax validation for ES modules (files with import/export)
    // new Function() doesn't support module syntax
    const isModule = /\b(import|export)\s/.test(content);
    if (!isModule) {
      try {
        // Basic syntax check - will catch most syntax errors
        new Function(content);
      } catch (e) {
        return { ok: false, reason: `JavaScript syntax error: ${e.message}` };
      }
    }
  }

  // HTML validation - check for basic structure
  if (language === "html" || path.endsWith(".html")) {
    if (!content.includes("<html") && !content.includes("<!DOCTYPE")) {
      return { ok: false, reason: "HTML file missing DOCTYPE or html tag" };
    }
  }

  return { ok: true };
}

function extractFilesFromContent(content) {
  const lines = content.split("\n");
  const rawFiles = [];
  let pendingPath = "";
  let inFence = false;
  let fenceLang = "text";
  let buffer = [];

  const filePattern =
    /^(?:\s*(?:File|Path)\s*[:\-]\s*|\/\/\s*File:\s*|\/\*\s*File:\s*|<!--\s*File:\s*)(.+?)(?:\s*-->|\s*\*\/)?$/i;

  const flushFence = () => {
    if (buffer.length && pendingPath) {
      const fileContent = buffer.join("\n").trimEnd();
      rawFiles.push({
        path: pendingPath.trim(),
        content: fileContent,
        language: fenceLang,
      });
    }
    pendingPath = "";
    buffer = [];
    fenceLang = "text";
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const fileMatch = trimmed.match(filePattern);
    if (fileMatch && !inFence) {
      pendingPath = fileMatch[1].trim();
      continue;
    }

    if (trimmed.startsWith("```")) {
      if (!inFence) {
        inFence = true;
        const fenceInfo = trimmed.replace(/^```+/, "").trim();
        if (fenceInfo) {
          fenceLang = fenceInfo.split(/\s+/)[0] || "text";
        }
        continue;
      }
      inFence = false;
      flushFence();
      continue;
    }

    if (inFence) {
      buffer.push(line);
    }
  }

  if (inFence) {
    flushFence();
  }

  // Validate and filter files, using Map for deduplication (last wins)
  const fileMap = new Map();
  const rejectedFiles = [];

  for (const file of rawFiles) {
    const validation = validateFileContent(file);
    if (validation.ok) {
      const pathValidation = validateFilePath(file.path);
      const normalizedPath = pathValidation.normalizedPath;
      // Last file with same path wins (allows LLM to correct itself)
      if (fileMap.has(normalizedPath)) {
        console.log(
          `[extractFiles] Overwriting duplicate file: ${normalizedPath}`,
        );
      }
      fileMap.set(normalizedPath, {
        ...file,
        path: normalizedPath,
      });
    } else {
      console.warn(
        `[extractFiles] Rejected file ${file.path}: ${validation.reason}`,
      );
      rejectedFiles.push({ path: file.path, reason: validation.reason });
    }
  }

  // Convert Map to array
  const validFiles = Array.from(fileMap.values());

  // Log summary
  if (rejectedFiles.length > 0) {
    console.warn(
      `[extractFiles] Rejected ${rejectedFiles.length} of ${rawFiles.length} files`,
    );
  }
  if (rawFiles.length !== validFiles.length) {
    const duplicatesRemoved =
      rawFiles.length - validFiles.length - rejectedFiles.length;
    console.log(
      `[extractFiles] Extracted ${validFiles.length} valid files from ${rawFiles.length} total (${duplicatesRemoved} duplicates removed)`,
    );
  }

  return {
    files: validFiles,
    rejected: rejectedFiles,
    totalExtracted: rawFiles.length,
    duplicatesRemoved:
      rawFiles.length - validFiles.length - rejectedFiles.length,
  };
}

function validateFileOutput(
  content,
  { requireScaffold, requireFiles, hasUserFiles },
) {
  const extractionResult = extractFilesFromContent(content);
  const files = extractionResult.files;
  const rejected = extractionResult.rejected;

  const required = requireScaffold
    ? ["index.html", "styles.css", "src/app.js"]
    : [];
  if (!files.length) {
    // If files already exist in the project (edit mode), allow responses without file blocks
    // This happens when LLM generates a plan or explanation for edits
    if (hasUserFiles && !requireScaffold) {
      return {
        ok: true,
        reason:
          "Edit mode: No new files generated, using existing project files.",
        files: [],
        rejected,
        required,
        missing: [],
      };
    }
    return {
      ok: !requireFiles,
      reason: "No file blocks were found in the response.",
      files: [],
      rejected,
      required,
      missing: required,
    };
  }

  const fileSet = new Set(files.map((file) => file.path));
  if (requireScaffold) {
    const missing = required.filter((path) => !fileSet.has(path));
    if (missing.length) {
      return {
        ok: false,
        reason: `Missing required files: ${missing.join(", ")}`,
        files,
        rejected,
        required,
        missing,
      };
    }
  }

  // Check if src/app.js imports all components in src/components/
  const componentFiles = files.filter(
    (file) =>
      file.path.startsWith("src/components/") && file.path.endsWith(".js"),
  );

  if (componentFiles.length > 0) {
    const appJsFile = files.find((file) => file.path === "src/app.js");
    if (appJsFile) {
      const appJsContent = appJsFile.content;
      const orphanedComponents = [];

      for (const component of componentFiles) {
        const componentPath = component.path.replace("src/", "./");
        // Check if component is imported in app.js
        const isImported =
          appJsContent.includes(componentPath) ||
          appJsContent.includes(component.path);
        if (!isImported) {
          orphanedComponents.push(component.path);
        }
      }

      if (orphanedComponents.length > 0) {
        console.warn(
          `[validateFileOutput] Orphaned components not imported in src/app.js: ${orphanedComponents.join(", ")}`,
        );

        // Fail validation - LLM must import all components
        const orphanedList = orphanedComponents
          .map((path) => path.replace("src/", "./"))
          .join(", ");
        return {
          ok: false,
          reason: `src/app.js must import all components. Missing imports for: ${orphanedList}`,
          files,
          rejected: [
            ...rejected,
            ...orphanedComponents.map((path) => ({
              path,
              reason: "Component not imported in src/app.js",
            })),
          ],
          required,
          missing: [],
          orphanedComponents,
        };
      }
    }
  }

  return { ok: true, reason: "", files, rejected, required, missing: [] };
}

async function generateChatCompletion({ model, messages, signal }) {
  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (response.status === 404) {
    const prompt = messages
      .map((msg) => {
        const role =
          msg.role === "assistant"
            ? "Assistant"
            : msg.role === "system"
              ? "System"
              : "User";
        return `${role}: ${msg.content}`;
      })
      .join("\n");
    const fallback = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: true }),
      signal,
    });
    if (!fallback.ok || !fallback.body) {
      throw new Error(`Generate request failed: ${fallback.status}`);
    }
    return readNdjsonStream(fallback);
  }

  if (!response.ok || !response.body) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return readNdjsonStream(response);
}

function formatConversationRow(row) {
  return {
    id: row.id,
    title: row.title,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preview: row.preview || "",
    messageCount: row.message_count || 0,
    tokenCount: row.token_count || 0,
  };
}

function listConversations(limit = 50, offset = 0) {
  const stmt = db.prepare(`
    SELECT
      c.id,
      c.title,
      c.model,
      c.created_at,
      c.updated_at,
      (
        SELECT content
        FROM messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC
        LIMIT 1
      ) AS preview,
      (
        SELECT COUNT(1)
        FROM messages
        WHERE conversation_id = c.id
      ) AS message_count,
      (
        SELECT COALESCE(SUM(total_tokens), 0)
        FROM token_usage
        WHERE conversation_id = c.id
      ) AS token_count
    FROM conversations c
    ORDER BY c.updated_at DESC
    LIMIT ? OFFSET ?
  `);
  return stmt.all(limit, offset).map(formatConversationRow);
}

function listMessages(conversationId) {
  const stmt = db.prepare(`
    SELECT
      id,
      role,
      content,
      model,
      images,
      metadata,
      created_at,
      (
        SELECT COALESCE(SUM(total_tokens), 0)
        FROM token_usage
        WHERE message_id = messages.id
      ) AS token_count
    FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `);
  return stmt.all(conversationId).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    model: row.model,
    images: row.images,
    metadata: row.metadata ? safeParseJson(row.metadata) : null,
    createdAt: row.created_at,
    tokens: row.token_count || 0,
  }));
}

function safeParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function ensureConversation({ id, title, model }) {
  const now = Date.now();
  const conversationId = id || randomUUID();
  const stmt = db.prepare(`
    INSERT INTO conversations (id, title, model, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(conversationId, title || "New chat", model || "llama3", now, now);
  return conversationId;
}

function touchConversation(conversationId) {
  const stmt = db.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `);
  stmt.run(Date.now(), conversationId);
}

function createMessage({
  conversationId,
  role,
  content,
  model,
  images,
  metadata,
}) {
  const messageId = randomUUID();
  const stmt = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, model, images, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const metadataJson =
    metadata && typeof metadata === "object" ? JSON.stringify(metadata) : null;
  stmt.run(
    messageId,
    conversationId,
    role,
    content,
    model || null,
    images || null,
    metadataJson,
    Date.now(),
  );
  touchConversation(conversationId);
  return messageId;
}

function updateMessage({ messageId, content, metadata }) {
  const stmt = db.prepare(`
    UPDATE messages
    SET content = ?, metadata = ?
    WHERE id = ?
  `);
  const metadataJson =
    metadata && typeof metadata === "object" ? JSON.stringify(metadata) : null;
  return stmt.run(content, metadataJson, messageId);
}

function updateConversationTitle(conversationId, title) {
  const stmt = db.prepare(`
    UPDATE conversations
    SET title = ?, updated_at = ?
    WHERE id = ?
  `);
  stmt.run(title, Date.now(), conversationId);
}

function deleteConversation(conversationId) {
  const stmt = db.prepare(`
    DELETE FROM conversations
    WHERE id = ?
  `);
  return stmt.run(conversationId);
}

function getConversation(conversationId) {
  const stmt = db.prepare(`
    SELECT id, title, model, created_at, updated_at
    FROM conversations
    WHERE id = ?
  `);
  return stmt.get(conversationId);
}

function getProjectByConversation(conversationId) {
  const stmt = db.prepare(`
    SELECT id, conversation_id, name, description, created_at, updated_at
    FROM projects
    WHERE conversation_id = ?
    LIMIT 1
  `);
  return stmt.get(conversationId);
}

function createProject({ conversationId, name, description }) {
  const projectId = randomUUID();
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO projects (id, conversation_id, name, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    projectId,
    conversationId,
    name || "Project",
    description || "",
    now,
    now,
  );
  return projectId;
}

function ensureProject(conversationId) {
  const existing = getProjectByConversation(conversationId);
  if (existing) return existing;
  const convo = getConversation(conversationId);
  const name = convo?.title || "Project";
  const projectId = createProject({
    conversationId,
    name,
    description: "Generated by Ollama Chat",
  });
  return (
    getProjectByConversation(conversationId) || {
      id: projectId,
      conversation_id: conversationId,
      name,
      description: "Generated by Ollama Chat",
      created_at: Date.now(),
      updated_at: Date.now(),
    }
  );
}

function countProjectFiles(projectId) {
  const stmt = db.prepare(`
    SELECT COUNT(1) AS count
    FROM project_files
    WHERE project_id = ?
  `);
  return stmt.get(projectId)?.count || 0;
}

function listProjectFiles(projectId) {
  const stmt = db.prepare(`
    SELECT id, path, language, size, created_at, updated_at
    FROM project_files
    WHERE project_id = ?
    ORDER BY path ASC
  `);
  return stmt.all(projectId).map((row) => ({
    id: row.id,
    path: row.path,
    language: row.language,
    size: row.size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

function getProjectFile(projectId, path) {
  const stmt = db.prepare(`
    SELECT id, path, content, language, size, created_at, updated_at
    FROM project_files
    WHERE project_id = ? AND path = ?
    LIMIT 1
  `);
  const row = stmt.get(projectId, path);
  if (!row) return null;
  return {
    id: row.id,
    path: row.path,
    content: row.content,
    language: row.language,
    size: row.size,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function upsertProjectFile({ projectId, path, content, language }) {
  const now = Date.now();
  const size = Buffer.byteLength(content || "", "utf8");
  const stmt = db.prepare(`
    INSERT INTO project_files (id, project_id, path, content, language, size, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id, path) DO UPDATE SET
      content = excluded.content,
      language = excluded.language,
      size = excluded.size,
      updated_at = excluded.updated_at
  `);
  const fileId = randomUUID();
  stmt.run(
    fileId,
    projectId,
    path,
    content || "",
    language || "text",
    size,
    now,
    now,
  );
  return getProjectFile(projectId, path);
}

function updateProject(projectId, { name, description }) {
  const now = Date.now();
  const stmt = db.prepare(`
    UPDATE projects
    SET name = COALESCE(?, name),
        description = COALESCE(?, description),
        updated_at = ?
    WHERE id = ?
  `);
  stmt.run(name || null, description || null, now, projectId);
}

function addTokenUsage({
  messageId,
  conversationId,
  model,
  promptTokens,
  completionTokens,
  totalTokens,
}) {
  const stmt = db.prepare(`
    INSERT INTO token_usage (
      message_id,
      conversation_id,
      model,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    messageId,
    conversationId,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
    Date.now(),
  );
}

// Create HTTP server for health checks + API
const server = createServer(async (req, res) => {
  // Log all incoming requests
  console.log(`[REQUEST] ${req.method} ${req.url}`);

  if (req.method === "OPTIONS") {
    const requestedHeaders = req.headers["access-control-request-headers"];
    res.writeHead(204, {
      ...JSON_HEADERS,
      "Access-Control-Allow-Headers":
        requestedHeaders || JSON_HEADERS["Access-Control-Allow-Headers"],
    });
    res.end();
    return;
  }

  if (req.url === "/health") {
    return sendJson(res, 200, { status: "ok", timestamp: Date.now() });
  }

  if (req.url === "/api/models" && req.method === "GET") {
    try {
      const response = await fetch(`${OLLAMA_HOST}/api/tags`);
      if (!response.ok) {
        return sendJson(res, 502, { error: "Failed to load models" });
      }
      const data = await response.json();
      const models = Array.isArray(data.models) ? data.models : [];
      return sendJson(res, 200, { models });
    } catch (error) {
      return sendJson(res, 502, { error: "Failed to load models" });
    }
  }

  if (req.url?.startsWith("/api/conversations")) {
    const [path, query] = req.url.split("?");
    const parts = path.split("/").filter(Boolean);

    if (parts.length === 4 && parts[2] && parts[3] === "stream") {
      const conversationId = parts[2];
      console.log(
        `[STREAM] Starting stream for conversation: ${conversationId}`,
      );

      if (req.method !== "POST") {
        return sendJson(res, 405, { error: "Method not allowed" });
      }
      const conversation = getConversation(conversationId);
      if (!conversation) {
        console.log(`[STREAM] Conversation not found: ${conversationId}`);
        return sendJson(res, 404, { error: "Conversation not found" });
      }
      try {
        const body = await parseBody(req);
        let model = body.model;
        const messages = Array.isArray(body.messages) ? body.messages : [];
        console.log(
          `[STREAM] Requested Model: ${model}, Messages: ${messages.length}`,
        );

        if (!model || !messages.length) {
          return sendJson(res, 400, { error: "Missing model or messages" });
        }

        const project = ensureProject(conversationId);
        const projectFiles = listProjectFiles(project.id);
        const hasUserFiles = projectFiles.some(
          (file) => file.path && !file.path.startsWith("project."),
        );

        // Check if this is a question/informational query
        const isQuestion = !shouldRequireFiles(messages);

        const requireScaffold = !hasUserFiles && !isQuestion;
        const requireFiles =
          requireScaffold || (!isQuestion && shouldRequireFiles(messages));

        // Pass full file contents for edit mode so LLM can make informed changes
        const projectContext = buildProjectContextSummary(
          project.id,
          hasUserFiles,
        );

        // For orchestration mode with reasoning models (like deepseek-r1),
        // switch to code-optimized model as reasoning models use thinking tokens
        // which don't work well for structured code generation
        // Don't use orchestration for questions - let the LLM answer conversationally
        let orchestrationMode =
          !isQuestion && (requireScaffold || requireFiles);
        if (orchestrationMode) {
          const isReasoningModel =
            model.includes("deepseek-r1") || model.includes("reasoning");

          if (isReasoningModel) {
            const codeModel = "qwen3-coder:30b";
            const codeModelAvailable = await isModelAvailable(codeModel);
            if (codeModelAvailable) {
              console.log(
                `[ORCHESTRATION] Switching from reasoning model ${model} to ${codeModel} for code generation`,
              );
              model = codeModel;
            } else {
              console.log(
                `[ORCHESTRATION] Code model ${codeModel} not available, using ${model} (may not work well with thinking tokens)`,
              );
            }
          } else {
            console.log(
              `[ORCHESTRATION] Using selected model ${model} for code generation`,
            );
          }
        }

        const modelAvailable = await isModelAvailable(model);
        if (!modelAvailable) {
          return sendJson(res, 400, { error: "Model not available" });
        }

        console.log(
          `[ORCHESTRATION] requireScaffold: ${requireScaffold}, requireFiles: ${requireFiles}, hasUserFiles: ${hasUserFiles}, model: ${model}`,
        );

        let streamingResponse = false;
        res.writeHead(200, {
          "Content-Type": "application/x-ndjson",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization",
        });
        streamingResponse = true;
        // Send unique start phase for each request so frontend creates new status box
        sendNdjson(res, {
          message: { content: "" },
          done: false,
          orchestration: {
            phase: "start",
            timestamp: Date.now(), // Unique timestamp ensures frontend treats this as new run
          },
        });

        const controller = new AbortController();

        // Track start time for elapsed time reporting
        const startTime = Date.now();
        const TIMEOUT_MS = 120000; // 2 minutes timeout

        // Setup timeout to kill stuck generations
        const timeoutHandle = setTimeout(() => {
          console.log("[ORCHESTRATION] Timeout reached (120s), aborting");
          controller.abort();
          if (!res.writableEnded) {
            sendNdjson(res, {
              message: { content: "" },
              done: true,
              orchestration: {
                phase: "timeout",
                validation: "failed",
                reason: "Generation timeout after 2 minutes",
                elapsed: 120,
              },
            });
            res.end();
          }
        }, TIMEOUT_MS);

        // Setup heartbeat to send periodic status updates
        const statusHeartbeat = setInterval(() => {
          if (!res.writableEnded) {
            const elapsed = Math.round((Date.now() - startTime) / 1000);
            sendNdjson(res, {
              message: { content: "" },
              done: false,
              orchestration: {
                phase: "heartbeat",
                elapsed,
              },
            });
            if (elapsed % 10 === 0) {
              // Log every 10 seconds
              console.log(`[ORCHESTRATION] Heartbeat at ${elapsed}s`);
            }
          }
        }, 1000); // Every 1 second

        // Clear heartbeat and timeout on stream completion or abort
        const cleanupHeartbeat = () => {
          clearInterval(statusHeartbeat);
          clearTimeout(timeoutHandle);
        };

        req.on("close", () => {
          console.log("[ORCHESTRATION] Client disconnected, aborting");
          controller.abort();
          cleanupHeartbeat();
        });

        let attempt = 0;
        const maxAttempts = 3; // Allow up to 3 attempts
        let attemptsUsed = 0;
        let finalChunks = [];
        let finalContent = "";
        let finalPromptTokens = 0;
        let finalCompletionTokens = 0;
        let validationStatus = "failed";
        let lastValidationDetails = null;
        let lastValidationOutput = "";

        // Step 1: Ask LLM which files it needs to see (for edit mode only)
        let requestedFiles = [];
        if (hasUserFiles && !requireScaffold) {
          const lastUserMessage = messages
            .filter((m) => m.role === "user")
            .pop();
          const userRequest = lastUserMessage?.content || "";

          sendNdjson(res, {
            message: { content: "" },
            done: false,
            orchestration: {
              phase: "analyzing",
              elapsed: Math.round((Date.now() - startTime) / 1000),
            },
          });

          requestedFiles = await requestFileContents({
            model,
            projectContext,
            userRequest,
            hasUserFiles,
          });

          console.log(
            `[ORCHESTRATION] LLM requested ${requestedFiles.length} files:`,
            requestedFiles,
          );

          if (requestedFiles.length > 0) {
            sendNdjson(res, {
              message: { content: "" },
              done: false,
              orchestration: {
                phase: "loading_files",
                elapsed: Math.round((Date.now() - startTime) / 1000),
                details: {
                  filesRequested: requestedFiles,
                },
              },
            });
          }
        }

        // Rebuild project context with requested file contents
        const fullProjectContext = buildProjectContextSummary(
          project.id,
          requestedFiles,
        );

        const planSteps = await generatePlan({
          model,
          projectContext: fullProjectContext,
          requireScaffold,
        });
        if (planSteps.length) {
          sendNdjson(res, {
            message: { content: "" },
            done: false,
            orchestration: {
              phase: "plan",
              elapsed: Math.round((Date.now() - startTime) / 1000),
              details: {
                steps: planSteps,
              },
            },
          });
        }

        while (attempt < maxAttempts) {
          attemptsUsed += 1;
          sendNdjson(res, {
            message: { content: "" },
            done: false,
            orchestration: {
              phase: attempt > 0 ? "retry" : "generate",
              attempt: attemptsUsed,
              elapsed: Math.round((Date.now() - startTime) / 1000),
            },
          });
          const systemPrompt = buildOrchestrationSystemPrompt({
            requireScaffold,
            requireFiles,
            projectContext: fullProjectContext,
          });
          const attemptMessages = [
            { role: "system", content: systemPrompt },
            ...messages,
          ];
          if (attempt > 0 && lastValidationDetails) {
            let retryMessage = `Your previous response was invalid. Please fix the following issues:\n\n`;
            retryMessage += `Reason: ${lastValidationDetails.reason}\n`;

            if (lastValidationDetails.missing?.length) {
              retryMessage += `Missing required files: ${lastValidationDetails.missing.join(", ")}\n`;
            }

            if (lastValidationDetails.filesFound?.length) {
              retryMessage += `Files you provided: ${lastValidationDetails.filesFound.join(", ")}\n`;
            }

            if (lastValidationDetails.filesRejected?.length) {
              retryMessage += `\nRejected files:\n`;
              lastValidationDetails.filesRejected.forEach((f) => {
                retryMessage += `- ${f.path}: ${f.reason}\n`;
              });
            }

            retryMessage += `\nRequired files: ${lastValidationDetails.required?.join(", ") || "index.html, styles.css, src/app.js"}`;
            retryMessage += `\n\nFollow the file output format strictly. Ensure all required files are included.`;

            attemptMessages.push({
              role: "assistant",
              content: lastValidationOutput.substring(0, 2000), // Include previous attempt (truncated)
            });
            attemptMessages.push({
              role: "system",
              content: retryMessage,
            });
          }

          const chunks = [];
          let content = "";
          let promptTokens = 0;
          let completionTokens = 0;
          const emittedFiles = new Set();
          let lastProgressUpdate = 0; // Track when we last sent progress update
          let stream;
          try {
            stream = await generateChatCompletion({
              model,
              messages: attemptMessages,
              signal: controller.signal,
            });
          } catch (error) {
            cleanupHeartbeat();
            sendNdjson(res, {
              message: { content: "" },
              done: true,
              prompt_eval_count: 0,
              eval_count: 0,
              model,
              orchestration: {
                attempts: attemptsUsed,
                validation: "failed",
                helpers: [],
                error: "generation_failed",
              },
            });
            res.end();
            return;
          }

          try {
            console.log(
              `[ORCHESTRATION] Starting LLM stream for attempt ${attemptsUsed + 1}`,
            );
            let chunkCount = 0;

            for await (const chunk of stream) {
              chunkCount++;
              const chunkText =
                chunk?.message?.content ?? chunk?.response ?? "";

              // For reasoning models like deepseek-r1, thinking tokens come first, content comes at the end
              const thinkingText = chunk?.message?.thinking ?? "";

              if (chunkCount % 50 === 0) {
                // Log every 50 chunks
                console.log(
                  `[ORCHESTRATION] Received ${chunkCount} chunks, content: ${content.length} bytes, thinking: ${thinkingText ? "yes" : "no"}`,
                );
              }

              if (chunkText) {
                chunks.push(chunkText);
                content += chunkText;
                sendNdjson(res, {
                  message: { content: chunkText },
                  done: false,
                });

                // Send progressive status updates every 500 bytes
                if (content.length - lastProgressUpdate > 500) {
                  sendNdjson(res, {
                    message: { content: "" },
                    done: false,
                    orchestration: {
                      phase: "generating",
                      bytesGenerated: content.length,
                      elapsed: Math.round((Date.now() - startTime) / 1000),
                    },
                  });
                  lastProgressUpdate = content.length;
                }
                if (chunkText.includes("```") || chunkText.includes("File:")) {
                  const extractionResult = extractFilesFromContent(content);
                  const files = extractionResult.files || [];
                  for (const file of files) {
                    if (emittedFiles.has(file.path)) continue;
                    emittedFiles.add(file.path);
                    if (planSteps.length) {
                      const matched = planSteps.find(
                        (step) =>
                          !step.done &&
                          step.label.toLowerCase().includes(file.path),
                      );
                      if (matched) {
                        matched.done = true;
                        sendNdjson(res, {
                          message: { content: "" },
                          done: false,
                          orchestration: {
                            phase: "step_complete",
                            details: {
                              steps: planSteps,
                              stepId: matched.id,
                            },
                          },
                        });
                      }
                    }
                    sendNdjson(res, {
                      message: { content: "" },
                      done: false,
                      orchestration: {
                        phase: "file_complete",
                        attempt: attemptsUsed,
                        details: {
                          path: file.path,
                          bytes: file.content.length,
                        },
                      },
                    });
                  }
                }
              }
              if (chunk?.prompt_eval_count) {
                promptTokens = chunk.prompt_eval_count;
              }
              if (chunk?.eval_count) {
                completionTokens = chunk.eval_count;
              }
            }
          } catch (error) {
            console.error(
              `[ORCHESTRATION] Stream error on attempt ${attemptsUsed}:`,
              error,
            );
            console.error(`[ORCHESTRATION] Error stack:`, error.stack);
            console.error(
              `[ORCHESTRATION] Content received so far: ${content.length} bytes`,
            );
            cleanupHeartbeat();
            sendNdjson(res, {
              message: { content: "" },
              done: true,
              prompt_eval_count: 0,
              eval_count: 0,
              model,
              orchestration: {
                attempts: attemptsUsed,
                validation: "failed",
                helpers: [],
                error: "stream_failed",
                errorMessage: error.message,
                elapsed: Math.round((Date.now() - startTime) / 1000),
              },
            });
            res.end();
            return;
          }

          console.log(
            `[ORCHESTRATION] LLM generation complete. Content length: ${content.length} bytes`,
          );
          console.log(
            `[ORCHESTRATION] First 500 chars: ${content.substring(0, 500)}`,
          );

          const validation = validateFileOutput(content, {
            requireScaffold,
            requireFiles,
            hasUserFiles,
          });

          console.log(
            `[ORCHESTRATION] Validation result: ${validation.ok ? "PASSED" : "FAILED"}`,
          );
          console.log(
            `[ORCHESTRATION] Files found: ${validation.files?.length || 0}, Rejected: ${validation.rejected?.length || 0}`,
          );
          if (!validation.ok) {
            console.log(
              `[ORCHESTRATION] Validation failure reason: ${validation.reason}`,
            );
          }

          if (validation.ok) {
            if (planSteps.length) {
              planSteps.forEach((step) => {
                step.done = true;
              });
            }
            finalChunks = chunks;
            finalContent = content;
            finalPromptTokens = promptTokens;
            finalCompletionTokens = completionTokens;
            validationStatus = "passed";
            sendNdjson(res, {
              message: { content: "" },
              done: false,
              orchestration: {
                phase: "validate",
                validation: "passed",
                attempt: attemptsUsed,
                elapsed: Math.round((Date.now() - startTime) / 1000),
                details: {
                  filesFound: (validation.files || []).map((file) => file.path),
                  filesRejected: validation.rejected || [],
                  steps: planSteps,
                },
              },
            });
            break;
          }
          const validationDetails = {
            reason: validation.reason || "Validation failed",
            required: validation.required || [],
            missing: validation.missing || [],
            filesFound: (validation.files || []).map((file) => file.path),
            filesRejected: validation.rejected || [],
            sample: content.slice(0, 400).trim(),
          };
          lastValidationDetails = validationDetails;
          lastValidationOutput = content || "";
          sendNdjson(res, {
            message: { content: "" },
            done: false,
            orchestration: {
              phase: "validate",
              validation: "failed",
              attempt: attemptsUsed,
              reason: validationDetails.reason,
              elapsed: Math.round((Date.now() - startTime) / 1000),
              details: validationDetails,
            },
          });
          attempt += 1;
        }

        if (!finalChunks.length && !finalContent) {
          cleanupHeartbeat();
          const fallbackDetails = {
            reason: "Validation failed",
            required: requireScaffold
              ? ["index.html", "styles.css", "src/app.js"]
              : [],
            missing: requireScaffold
              ? ["index.html", "styles.css", "src/app.js"]
              : [],
            filesFound: [],
            sample: "",
          };
          const failedDetails = {
            ...(lastValidationDetails || fallbackDetails),
            output: lastValidationOutput,
          };
          sendNdjson(res, {
            message: { content: "" },
            done: true,
            prompt_eval_count: 0,
            eval_count: 0,
            model,
            orchestration: {
              attempts: attemptsUsed,
              validation: "failed",
              helpers: [],
              reason: failedDetails.reason,
              elapsed: Math.round((Date.now() - startTime) / 1000),
              details: {
                ...failedDetails,
                steps: planSteps,
              },
            },
          });
          res.end();
          return;
        }

        cleanupHeartbeat();
        sendNdjson(res, {
          message: { content: "" },
          done: true,
          prompt_eval_count: finalPromptTokens || 0,
          eval_count: finalCompletionTokens || 0,
          model,
          orchestration: {
            phase: "complete",
            attempts: attemptsUsed,
            validation: validationStatus,
            helpers: [],
            reason: validationStatus === "failed" ? "Validation failed" : "",
            elapsed: Math.round((Date.now() - startTime) / 1000),
            details:
              validationStatus === "passed"
                ? (() => {
                    const extractionResult =
                      extractFilesFromContent(finalContent);
                    return {
                      filesFound: extractionResult.files.map(
                        (file) => file.path,
                      ),
                      filesRejected: extractionResult.rejected,
                      output: finalContent,
                      steps: planSteps,
                    };
                  })()
                : undefined,
          },
        });
        res.end();
        return;
      } catch (error) {
        console.warn("[backend] Orchestrated stream failed:", error);
        if (res.writableEnded) return;
        if (res.headersSent || streamingResponse) {
          sendNdjson(res, {
            message: { content: "" },
            done: true,
            prompt_eval_count: 0,
            eval_count: 0,
            orchestration: {
              attempts: 0,
              validation: "failed",
              helpers: [],
              error: "stream_failed",
            },
          });
          res.end();
          return;
        }
        return sendJson(res, 500, { error: "Stream failed" });
      }
    }

    if (req.method === "GET" && parts.length === 2) {
      const params = new URLSearchParams(query || "");
      const limit = Number(params.get("limit") || 50);
      const offset = Number(params.get("offset") || 0);
      return sendJson(res, 200, {
        conversations: listConversations(limit, offset),
      });
    }

    if (req.method === "POST" && parts.length === 2) {
      try {
        const body = await parseBody(req);
        const conversationId = ensureConversation({
          id: body.id,
          title: body.title,
          model: body.model,
        });
        return sendJson(res, 201, { id: conversationId });
      } catch (error) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
    }

    if (parts.length === 3 && parts[2] && req.method === "PATCH") {
      try {
        const body = await parseBody(req);
        if (!body.title) {
          return sendJson(res, 400, { error: "Missing title" });
        }
        updateConversationTitle(parts[2], body.title);
        return sendJson(res, 200, { ok: true });
      } catch (error) {
        return sendJson(res, 400, { error: "Invalid JSON" });
      }
    }

    if (parts.length === 3 && parts[2] && req.method === "DELETE") {
      const result = deleteConversation(parts[2]);
      if (!result?.changes) {
        return sendJson(res, 404, { error: "Conversation not found" });
      }
      return sendJson(res, 200, { ok: true });
    }

    if (parts.length === 4 && parts[2] && parts[3] === "project") {
      const conversationId = parts[2];
      if (req.method === "GET") {
        const project = ensureProject(conversationId);
        const fileCount = project?.id ? countProjectFiles(project.id) : 0;
        return sendJson(res, 200, {
          project: project
            ? {
                id: project.id,
                conversationId: project.conversation_id,
                name: project.name,
                description: project.description,
                createdAt: project.created_at,
                updatedAt: project.updated_at,
                fileCount,
              }
            : null,
        });
      }
    }

    if (parts.length === 4 && parts[2] && parts[3] === "messages") {
      const conversationId = parts[2];
      if (req.method === "GET") {
        return sendJson(res, 200, { messages: listMessages(conversationId) });
      }
      if (req.method === "POST") {
        try {
          const body = await parseBody(req);
          const messageId = createMessage({
            conversationId,
            role: body.role,
            content: body.content,
            model: body.model,
            images: body.images,
            metadata: body.metadata,
          });
          return sendJson(res, 201, { id: messageId });
        } catch (error) {
          return sendJson(res, 400, { error: "Invalid JSON" });
        }
      }
    }

    if (parts.length === 5 && parts[2] && parts[3] === "messages") {
      const conversationId = parts[2];
      const messageId = parts[4];
      if (req.method === "PATCH") {
        try {
          const body = await parseBody(req);
          const result = updateMessage({
            messageId,
            content: body.content,
            metadata: body.metadata,
          });
          if (!result?.changes) {
            return sendJson(res, 404, { error: "Message not found" });
          }
          touchConversation(conversationId);
          return sendJson(res, 200, { ok: true });
        } catch (error) {
          return sendJson(res, 400, { error: "Invalid JSON" });
        }
      }
    }
  }

  if (req.url?.startsWith("/api/proxy")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const target = url.searchParams.get("url");
    if (!target) {
      res.writeHead(400, PREVIEW_HEADERS);
      res.end("Missing url parameter");
      return;
    }
    return proxyRequest(res, target);
  }

  if (req.url === "/api/token-usage" && req.method === "POST") {
    try {
      const body = await parseBody(req);
      addTokenUsage({
        messageId: body.messageId,
        conversationId: body.conversationId,
        model: body.model,
        promptTokens: body.promptTokens || 0,
        completionTokens: body.completionTokens || 0,
        totalTokens: body.totalTokens || 0,
      });
      return sendJson(res, 201, { ok: true });
    } catch (error) {
      return sendJson(res, 400, { error: "Invalid JSON" });
    }
  }

  if (req.url?.startsWith("/api/projects")) {
    const [path, query] = req.url.split("?");
    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 4 && parts[2] && parts[3] === "preview") {
      const projectId = parts[2];
      const rawPath = parts.slice(4).join("/");
      const entryPath = getPreviewEntry(projectId);
      const requestedPath = sanitizePreviewPath(rawPath || entryPath);
      if (!requestedPath) {
        res.writeHead(400, PREVIEW_HEADERS);
        res.end("Invalid path");
        return;
      }
      const file = getProjectFile(projectId, requestedPath);
      if (!file?.content) {
        res.writeHead(404, PREVIEW_HEADERS);
        res.end("File not found");
        return;
      }
      const fileList = listProjectFiles(projectId);
      const paths = Array.isArray(fileList)
        ? fileList.map((item) => item.path).filter(Boolean)
        : [];
      let body = file.content;
      if (requestedPath.endsWith(".html")) {
        body = normalizePreviewHtml(projectId, file.content, paths);
      } else if (requestedPath.endsWith(".js")) {
        body = normalizePreviewJs(file.content);
      }
      res.writeHead(200, {
        ...PREVIEW_HEADERS,
        "Content-Type": contentTypeForPath(requestedPath),
      });
      res.end(body);
      return;
    }
    if (parts.length === 3 && parts[2]) {
      const projectId = parts[2];
      if (req.method === "GET") {
        const files = listProjectFiles(projectId);
        return sendJson(res, 200, { files });
      }
      if (req.method === "PATCH") {
        try {
          const body = await parseBody(req);
          if (!body.name && !body.description) {
            return sendJson(res, 400, { error: "Missing update fields" });
          }
          updateProject(projectId, {
            name: body.name,
            description: body.description,
          });
          return sendJson(res, 200, { ok: true });
        } catch (error) {
          return sendJson(res, 400, { error: "Invalid JSON" });
        }
      }
    }

    if (parts.length === 4 && parts[2] && parts[3] === "files") {
      const projectId = parts[2];
      if (req.method === "GET") {
        const params = new URLSearchParams(query || "");
        const pathParam = params.get("path");
        if (pathParam) {
          const file = getProjectFile(projectId, pathParam);
          if (!file) {
            return sendJson(res, 404, { error: "File not found" });
          }
          return sendJson(res, 200, { file });
        }
        const files = listProjectFiles(projectId);
        return sendJson(res, 200, { files });
      }

      if (req.method === "POST") {
        try {
          const body = await parseBody(req);
          if (!body.path || body.content === undefined) {
            return sendJson(res, 400, { error: "Missing path or content" });
          }
          const file = upsertProjectFile({
            projectId,
            path: body.path,
            content: body.content,
            language: body.language || "text",
          });
          return sendJson(res, 200, { file });
        } catch (error) {
          return sendJson(res, 400, { error: "Invalid JSON" });
        }
      }
    }
  }

  res.writeHead(404, JSON_HEADERS);
  res.end(JSON.stringify({ error: "Not found" }));
});

// Create WebSocket server
const wss = new WebSocketServer({ server });

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  const clientId = Math.random().toString(36).substring(7);
  console.log(
    `[WS] Client connected: ${clientId} from ${req.socket.remoteAddress}`,
  );

  // Send welcome message
  ws.send(
    JSON.stringify({
      type: "system.connected",
      data: {
        sessionId: clientId,
        serverVersion: "1.0.0",
      },
    }),
  );

  // Message handler
  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`[WS] Received message from ${clientId}:`, message.type);

      // Echo back for now (basic functionality)
      ws.send(
        JSON.stringify({
          type: "echo",
          data: {
            original: message,
            timestamp: Date.now(),
          },
        }),
      );
    } catch (err) {
      console.error(`[WS] Error processing message from ${clientId}:`, err);
      ws.send(
        JSON.stringify({
          type: "error",
          data: {
            code: "INVALID_MESSAGE",
            message: "Failed to parse message",
            retryable: false,
          },
        }),
      );
    }
  });

  // Ping/pong for keepalive
  ws.on("pong", () => {
    console.log(`[WS] Pong from ${clientId}`);
  });

  // Disconnection handler
  ws.on("close", () => {
    console.log(`[WS] Client disconnected: ${clientId}`);
  });

  // Error handler
  ws.on("error", (err) => {
    console.error(`[WS] Error for client ${clientId}:`, err);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`[SERVER] WebSocket server listening on port ${PORT}`);
  console.log(
    `[SERVER] Health check available at http://localhost:${PORT}/health`,
  );
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[SERVER] SIGTERM received, shutting down gracefully");
  wss.close(() => {
    console.log("[SERVER] WebSocket server closed");
    closeDatabase(db);
    server.close(() => {
      console.log("[SERVER] HTTP server closed");
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("[SERVER] SIGINT received, shutting down gracefully");
  wss.close(() => {
    console.log("[SERVER] WebSocket server closed");
    closeDatabase(db);
    server.close(() => {
      console.log("[SERVER] HTTP server closed");
      process.exit(0);
    });
  });
});
