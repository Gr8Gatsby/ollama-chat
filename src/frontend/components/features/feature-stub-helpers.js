import { BaseComponent } from "../base/base-component.js";

/**
 * Base helper class for feature-component stubs.
 * Extends BaseComponent so helpers can rely on shared theme/reset styles.
 */
export class FeatureStubComponent extends BaseComponent {
  constructor() {
    super();
    if (new.target === FeatureStubComponent) {
      throw new Error(
        "FeatureStubComponent should not be instantiated directly.",
      );
    }
  }
}

/**
 * Render a standardized placeholder inside the component's shadow DOM.
 * @param {BaseComponent} component
 * @param {object} options
 * @param {string} options.title - Component name
 * @param {string} options.description - Short description of the component's responsibility
 * @param {string[]} options.dependencies - Base components that this feature relies on
 * @param {string[]} options.responsibilities - Bullet list of responsibilities or TODOs
 */
export function renderStubPlaceholder(
  component,
  { title, description, dependencies = [], responsibilities = [] },
) {
  const dependencyMarkup = dependencies.length
    ? `<p class="placeholder__deps"><strong>Base components:</strong> ${dependencies.join(", ")}</p>`
    : "";

  const responsibilitiesMarkup = responsibilities.length
    ? `<ul class="placeholder__list">${responsibilities.map((item) => `<li>${item}</li>`).join("")}</ul>`
    : "";

  component.shadowRoot.innerHTML = `
    <style>
      ${component.getResetStyles?.() ?? ""}
      ${component.getThemeStyles?.() ?? ""}

      :host {
        display: block;
      }

      .placeholder {
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-md);
        padding: var(--spacing-md);
        background: color-mix(in srgb, var(--color-bg-primary) 92%, var(--color-accent-primary) 8%);
        color: var(--color-text-primary);
        font-family: var(--font-family);
        font-size: var(--font-size-sm);
        box-shadow: var(--shadow-sm);
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm);
      }

      .placeholder__title {
        font-size: var(--font-size-md);
        font-weight: 600;
        color: var(--color-text-primary);
      }

      .placeholder__desc,
      .placeholder__deps,
      .placeholder__list {
        color: var(--color-text-primary);
      }

      .placeholder__list {
        padding-inline-start: var(--spacing-lg);
        display: flex;
        flex-direction: column;
        gap: calc(var(--spacing-xs) + 1px);
      }
    </style>

    <div class="placeholder" role="note" aria-live="polite">
      <span class="placeholder__title">${title}</span>
      <p class="placeholder__desc">${description}</p>
      ${dependencyMarkup}
      ${responsibilitiesMarkup}
      <p class="placeholder__desc">See <code>docs/features/01-base-components.md</code> (Phase 7) for implementation details.</p>
    </div>
  `;
}

/**
 * Log a warning in the console reminding developers that the component is a stub.
 * Ensures the warning only appears once per component type per session.
 * @param {string} componentTag
 */
export function logStubWarning(componentTag) {
  const registryKey = "__ollamaFeatureStubWarnings";
  const globalObj = window;
  if (!globalObj[registryKey]) {
    globalObj[registryKey] = new Set();
  }
  const registry = globalObj[registryKey];
  if (!registry.has(componentTag)) {
    registry.add(componentTag);
    console.warn(
      `[${componentTag}] Feature component stub loaded. Replace placeholder with full implementation per docs/features/01-base-components.md.`,
    );
  }
}
