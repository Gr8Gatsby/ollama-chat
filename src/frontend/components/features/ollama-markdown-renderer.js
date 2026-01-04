import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-text.js";
import "../base/ollama-code-block.js";

class OllamaMarkdownRenderer extends BaseComponent {
  static get observedAttributes() {
    return ["content"];
  }

  constructor() {
    super();
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get content() {
    return this.getAttribute("content") || "";
  }

  renderParagraphs(text) {
    const lines = text.split("\n");
    let output = "";
    let buffer = [];
    let listItems = [];
    let ordered = false;
    let quoteLines = [];

    const parseTableRow = (line) => {
      let row = line.trim();
      if (row.startsWith("|")) row = row.slice(1);
      if (row.endsWith("|")) row = row.slice(0, -1);
      return row.split("|").map((cell) => cell.trim());
    };

    const parseTableAlignments = (line) => {
      const cells = parseTableRow(line);
      return cells.map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        if (left && right) return "center";
        if (right) return "right";
        return "left";
      });
    };

    const isTableSeparator = (line) =>
      /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);

    const flushParagraph = () => {
      if (!buffer.length) return;
      const paragraph = buffer.join(" ");
      output += `<p class="paragraph">${this.renderInline(paragraph)}</p>`;
      buffer = [];
    };

    const flushList = () => {
      if (!listItems.length) return;
      const tag = ordered ? "ol" : "ul";
      output += `<${tag} class="list">${listItems
        .map((item) => `<li>${this.renderInline(item)}</li>`)
        .join("")}</${tag}>`;
      listItems = [];
    };

    const flushQuote = () => {
      if (!quoteLines.length) return;
      output += `<blockquote>${this.renderInline(quoteLines.join(" "))}</blockquote>`;
      quoteLines = [];
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (!trimmed) {
        flushParagraph();
        flushList();
        flushQuote();
        continue;
      }

      const nextLine = lines[index + 1] || "";
      if (trimmed.includes("|") && isTableSeparator(nextLine)) {
        flushParagraph();
        flushList();
        flushQuote();
        const headerCells = parseTableRow(trimmed);
        const alignments = parseTableAlignments(nextLine);
        const bodyRows = [];
        index += 2;
        for (; index < lines.length; index += 1) {
          const bodyLine = lines[index];
          if (!bodyLine.trim()) {
            break;
          }
          if (!bodyLine.includes("|")) {
            index -= 1;
            break;
          }
          bodyRows.push(parseTableRow(bodyLine));
        }
        const head = `<thead><tr>${headerCells
          .map(
            (cell, i) =>
              `<th style="text-align:${alignments[i] || "left"}">${this.renderInline(
                cell,
              )}</th>`,
          )
          .join("")}</tr></thead>`;
        const body = `<tbody>${bodyRows
          .map(
            (row) =>
              `<tr>${row
                .map(
                  (cell, i) =>
                    `<td style="text-align:${alignments[i] || "left"}">${this.renderInline(
                      cell,
                    )}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("")}</tbody>`;
        output += `<table class="table">${head}${body}</table>`;
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        flushQuote();
        const level = headingMatch[1].length;
        output += `<h${level}>${this.renderInline(headingMatch[2])}</h${level}>`;
        continue;
      }

      if (trimmed.startsWith(">")) {
        flushParagraph();
        flushList();
        quoteLines.push(trimmed.replace(/^>\s?/, ""));
        continue;
      }

      const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
      if (orderedMatch) {
        flushParagraph();
        flushQuote();
        ordered = true;
        listItems.push(orderedMatch[1]);
        continue;
      }

      const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (unorderedMatch) {
        flushParagraph();
        flushQuote();
        ordered = false;
        listItems.push(unorderedMatch[1]);
        continue;
      }

      buffer.push(trimmed);
    }

    flushParagraph();
    flushList();
    flushQuote();
    return output;
  }

  renderBlocks(content) {
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let lastIndex = 0;
    let output = "";

    while ((match = regex.exec(content)) !== null) {
      const [full, lang, code] = match;
      const index = match.index;
      const before = content.slice(lastIndex, index);
      if (before.trim()) {
        output += this.renderParagraphs(before);
      }
      const safeCode = this.escapeAttribute(code.trim());
      output += `<ollama-code-block language="${this.escapeAttribute(
        lang || "text",
      )}" code="${safeCode}"></ollama-code-block>`;
      lastIndex = index + full.length;
    }

    const remaining = content.slice(lastIndex);
    if (remaining.trim()) {
      output += this.renderParagraphs(remaining);
    }

    return output || `<ollama-text>${this.escapeHtml(content)}</ollama-text>`;
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  renderInline(text) {
    const escaped = this.escapeHtml(text);
    const withLinks = escaped.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_, label, url) =>
        `<a href="${this.escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`,
    );
    return withLinks
      .replace(/`([^`]+)`/g, '<code class="inline">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  escapeAttribute(value) {
    return String(value).replace(/"/g, "&quot;");
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        ${this.getResetStyles()}
        ${this.getThemeStyles()}

        :host {
          display: block;
          width: 100%;
          font-family: var(--font-family);
          color: var(--color-text-primary);
        }

        .paragraph {
          margin: 0 0 var(--spacing-sm);
        }

        .paragraph:last-child {
          margin-bottom: 0;
        }

        h1,
        h2,
        h3,
        h4,
        h5,
        h6 {
          margin: 0 0 var(--spacing-sm);
          font-family: var(--font-family);
          color: var(--color-text-primary);
        }

        h1 { font-size: var(--font-size-xl); }
        h2 { font-size: var(--font-size-lg); }
        h3 { font-size: var(--font-size-md); }
        h4 { font-size: var(--font-size-md); }
        h5 { font-size: var(--font-size-sm); }
        h6 { font-size: var(--font-size-sm); }

        .list {
          margin: 0 0 var(--spacing-sm);
          padding-inline-start: var(--spacing-lg);
          color: var(--color-text-primary);
          font-family: var(--font-family);
        }

        blockquote {
          margin: 0 0 var(--spacing-sm);
          padding-inline-start: var(--spacing-md);
          border-inline-start: 3px solid var(--color-border);
          color: var(--color-text-secondary);
          font-family: var(--font-family);
        }

        a {
          color: var(--color-accent-primary);
          text-decoration: none;
        }

        a:hover {
          text-decoration: underline;
        }

        code.inline {
          font-family: var(--font-family-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
          background: var(--color-bg-secondary);
          padding: 0 4px;
          border-radius: var(--radius-sm);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          margin: 0 0 var(--spacing-sm);
          font-family: var(--font-family);
        }

        .table th,
        .table td {
          border: 1px solid var(--color-border);
          padding: var(--spacing-xs) var(--spacing-sm);
          vertical-align: top;
        }

        .table th {
          background: var(--color-bg-secondary);
          color: var(--color-text-primary);
          font-weight: 600;
        }
      </style>
      <div class="content">
        ${this.renderBlocks(this.content)}
      </div>
    `;
  }
}

if (!customElements.get("ollama-markdown-renderer")) {
  customElements.define("ollama-markdown-renderer", OllamaMarkdownRenderer);
}

export { OllamaMarkdownRenderer };
