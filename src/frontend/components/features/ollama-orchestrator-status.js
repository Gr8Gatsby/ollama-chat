import { BaseComponent } from "../base/base-component.js";
import "../base/ollama-text.js";

class OllamaOrchestratorStatus extends BaseComponent {
  static get observedAttributes() {
    return [
      "phase",
      "elapsed",
      "files",
      "steps",
      "bytes-generated",
      "files-requested",
      "expanded",
    ];
  }

  constructor() {
    super();
    this.runId = Date.now();
    this.render();
  }

  get isExpanded() {
    return this.hasAttribute("expanded");
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this.render();
  }

  connectedCallback() {
    super.connectedCallback();
    this.attachEventListeners();
  }

  attachEventListeners() {
    const header = this.shadowRoot?.querySelector(".status-header");
    if (header) {
      header.addEventListener("click", () => {
        if (this.isExpanded) {
          this.removeAttribute("expanded");
        } else {
          this.setAttribute("expanded", "");
        }
      });
    }
  }

  getSummary(fileList, stepList) {
    const parts = [];

    if (fileList.length > 0) {
      parts.push(`${fileList.length} file${fileList.length !== 1 ? "s" : ""}`);
    }

    if (stepList.length > 0) {
      const doneSteps = stepList.filter((s) => s.done).length;
      parts.push(`${doneSteps}/${stepList.length} steps`);
    }

    return parts.length > 0 ? parts.join(" • ") : "";
  }

  render() {
    const phase = this.getAttribute("phase") || "working";
    const elapsed = this.getAttribute("elapsed") || "0";
    const files = this.getAttribute("files") || "";
    const steps = this.getAttribute("steps") || "";
    const bytesGenerated = this.getAttribute("bytes-generated") || "";
    const filesRequested = this.getAttribute("files-requested") || "";

    const fileList = files ? files.split(",").filter(Boolean) : [];

    // Safely parse steps JSON with error handling
    let stepList = [];
    if (steps) {
      try {
        stepList = JSON.parse(steps);
      } catch (err) {
        console.error(
          "[orchestrator-status] Failed to parse steps JSON:",
          err,
          steps,
        );
        stepList = [];
      }
    }

    const requestedFilesList = filesRequested
      ? filesRequested.split(",").filter(Boolean)
      : [];

    console.log("[orchestrator-status] Rendering:", {
      phase,
      files,
      fileList,
      steps,
      stepList,
    });

    // Determine phase label
    let phaseLabel = "";
    const isComplete = phase === "complete";
    const isFailed = phase === "failed";

    switch (phase) {
      case "start":
        phaseLabel = "Starting";
        break;
      case "analyzing":
        phaseLabel = "Analyzing";
        break;
      case "loading_files":
        phaseLabel = "Loading files";
        break;
      case "plan":
        phaseLabel = "Planning";
        break;
      case "generate":
      case "retry":
      case "generating":
        phaseLabel = "Generating";
        break;
      case "validate":
        phaseLabel = "Validating";
        break;
      case "complete":
        phaseLabel = "Complete";
        break;
      case "failed":
        phaseLabel = "Failed";
        break;
      case "heartbeat":
        phaseLabel = "Working";
        break;
      default:
        phaseLabel = phase;
    }

    const summary = this.getSummary(fileList, stepList);
    const expandIcon = this.isExpanded ? "▼" : "▶";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin: 8px 0;
          padding: 10px 12px;
          background: var(--color-bg-tertiary, #f8f9fa);
          border-radius: var(--radius-md, 6px);
          font-family: system-ui, -apple-system, sans-serif;
          border: 1px solid var(--color-border, #e0e0e0);
        }

        :host([phase="complete"]) {
          background: #f0f8f0;
          border-color: #c3e6c3;
        }

        :host([phase="failed"]) {
          background: #f8f0f0;
          border-color: #f5c6cb;
        }

        .status-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--color-text-secondary, #666);
          cursor: pointer;
          user-select: none;
        }

        .status-header:hover {
          color: var(--color-text-primary, #333);
        }

        .expand-icon {
          font-size: 10px;
          color: var(--color-text-muted, #999);
          transition: transform 0.2s;
        }

        .phase-label {
          font-weight: 500;
          color: var(--color-text-primary, #333);
        }

        :host([phase="complete"]) .phase-label {
          color: #28a745;
        }

        :host([phase="failed"]) .phase-label {
          color: #dc3545;
        }

        .elapsed {
          color: var(--color-text-muted, #999);
        }

        .summary {
          color: var(--color-text-secondary, #666);
        }

        .details {
          margin-top: 12px;
          display: ${this.isExpanded ? "block" : "none"};
        }

        .section {
          margin-top: 10px;
        }

        .section-title {
          font-size: 12px;
          font-weight: 600;
          color: var(--color-text-primary, #333);
          margin-bottom: 6px;
        }

        .files-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .file-item {
          font-size: 12px;
          color: var(--color-text-secondary, #666);
          padding: 3px 0;
          font-family: 'Courier New', monospace;
        }

        .steps-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .step-item {
          font-size: 12px;
          color: var(--color-text-secondary, #666);
          padding: 3px 0;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .step-item.done {
          color: #28a745;
        }

        .step-mark {
          width: 16px;
          text-align: center;
          font-weight: bold;
        }

        .bytes-info {
          font-size: 12px;
          color: var(--color-text-muted, #999);
          margin-top: 8px;
        }
      </style>

      <div class="status-header">
        <span class="expand-icon">${expandIcon}</span>
        <span class="phase-label">Orchestrator: ${phaseLabel}</span>
        <span class="elapsed">${elapsed}s</span>
        ${summary ? `<span class="summary">• ${summary}</span>` : ""}
      </div>

      ${
        this.isExpanded
          ? `
        <div class="details">
          ${
            requestedFilesList.length > 0
              ? `
            <div class="section">
              <div class="section-title">Files Loaded:</div>
              <ul class="files-list">
                ${requestedFilesList.map((f) => `<li class="file-item">${f}</li>`).join("")}
              </ul>
            </div>
          `
              : ""
          }

          ${
            fileList.length > 0
              ? `
            <div class="section">
              <div class="section-title">Files Generated:</div>
              <ul class="files-list">
                ${fileList.map((f) => `<li class="file-item">${f}</li>`).join("")}
              </ul>
            </div>
          `
              : ""
          }

          ${
            stepList.length > 0
              ? `
            <div class="section">
              <div class="section-title">Plan:</div>
              <ul class="steps-list">
                ${stepList
                  .map(
                    (step) => `
                  <li class="step-item ${step.done ? "done" : ""}">
                    <span class="step-mark">${step.done ? "✓" : "○"}</span>
                    <span>${step.label}</span>
                  </li>
                `,
                  )
                  .join("")}
              </ul>
            </div>
          `
              : ""
          }

          ${
            bytesGenerated
              ? `
            <div class="bytes-info">
              ${Math.round(parseInt(bytesGenerated) / 1024)}KB generated
            </div>
          `
              : ""
          }
        </div>
      `
          : ""
      }
    `;

    this.attachEventListeners();
  }
}

customElements.define("ollama-orchestrator-status", OllamaOrchestratorStatus);
