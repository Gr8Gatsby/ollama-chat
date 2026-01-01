# Development Specification

## Overview

Technical implementation details, architecture decisions, and development guidelines for Ollama Chat.

## Technology Stack

### Frontend
- **HTML5**: Semantic markup for application structure
- **Web Components**: Custom elements using native browser APIs (NO frameworks like React/Vue)
- **Lucide Icons**: Exclusive icon library (https://lucide.dev)
- **CSS**: Component-scoped styling with theming support
- **JavaScript**: ES modules, modern browser features

### Infrastructure
- **Docker**: Containerized development environment for consistency across machines
- **Ollama**: Local LLM runtime

## Architecture

### Component-Based Architecture
- Use Web Components for all reusable UI elements
- Semantic HTML5 tags (`<header>`, `<main>`, `<aside>`, `<nav>`, etc.) for layout
- Web Components for controls and individual sections

### Client Architecture
- Single-page application (SPA) structure
- Event-driven communication between components
- Streaming SSE/WebSocket connections to backend for LLM responses

## Implementation Requirements

### DR-1: Web Components Implementation
**Requirement**: Build all UI components as native Web Components with strict reusability and consistency.

**Technical Specifications**:
- MUST use Custom Elements API (`customElements.define()`)
- MUST use Shadow DOM for style encapsulation
- MUST define components inline in HTML `<script>` tags BEFORE first usage to prevent FOUC (flash of unstyled content)
- MUST follow naming convention: `ollama-*` prefix (e.g., `<ollama-chat-message>`)
- MUST support attribute-based configuration
- MUST emit custom events for component communication
- SHOULD use `<template>` tags for component markup

**Component Reuse Policy**:
- MUST reuse existing components before creating new ones
- Creating new components requires justification (document why existing components insufficient)
- Visual consistency is CRITICAL - new components must match existing design patterns
- When in doubt, extend existing components rather than create new ones

**Common Component Library**:
All instances of these components MUST use the same base component:
- `<ollama-button>` - All buttons (primary, secondary, icon-only)
- `<ollama-dialog>` - All modal dialogs and popups
- `<ollama-input>` - All text inputs
- `<ollama-icon>` - All icons (wraps Lucide icons)
- `<ollama-tooltip>` - All tooltips
- `<ollama-select>` - All dropdowns/selects

**Example Pattern**:
```html
<script>
  class OllamaChatMessage extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
    // Implementation
  }
  customElements.define('ollama-chat-message', OllamaChatMessage);
</script>
<ollama-chat-message></ollama-chat-message>
```

---

### DR-1a: Icon-First UI Pattern
**Requirement**: Prefer icon-only buttons with tooltips for common actions over text labels.

**Technical Specifications**:
- Icon buttons MUST use `<ollama-button variant="icon">` with `<ollama-icon>` child
- ALL icon-only buttons MUST have `<ollama-tooltip>` for accessibility and discoverability
- Tooltips MUST appear on hover and focus
- Common actions (delete, edit, copy, send, etc.) SHOULD use icons only
- Text labels SHOULD be used only for primary CTAs or uncommon actions
- Icon choice MUST be semantically obvious (use common conventions)

**Example Pattern**:
```html
<!-- Good: Icon with tooltip -->
<ollama-button variant="icon" aria-label="Delete message">
  <ollama-icon name="trash-2"></ollama-icon>
  <ollama-tooltip>Delete message</ollama-tooltip>
</ollama-button>

<!-- Bad: Icon with redundant text -->
<ollama-button>
  <ollama-icon name="trash-2"></ollama-icon>
  Delete
</ollama-button>
```

**Common Icon Mappings** (use these consistently):
- `trash-2` - Delete
- `edit-3` or `pencil` - Edit
- `copy` - Copy
- `check` - Confirm/Success
- `x` - Close/Cancel
- `send` - Send message
- `plus` - Add/New
- `settings` - Settings
- `image` - Upload image
- `message-square` - New conversation

---

### DR-2: Semantic HTML Structure
**Requirement**: Use semantic HTML5 elements for application layout.

**Technical Specifications**:
- MUST use `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>` for layout
- MUST use `<article>`, `<section>` for content grouping
- Web Components ONLY for interactive controls and reusable sections
- MUST maintain accessible landmark structure
- MUST use appropriate heading hierarchy (`<h1>` through `<h6>`)

---

### DR-3: Lucide Icons Integration
**Requirement**: Use Lucide icons exclusively for all iconography.

**Technical Specifications**:
- MUST use Lucide icon library from https://lucide.dev
- MUST load icons via CDN or npm package
- SHOULD create `<ollama-icon>` component wrapper for consistent usage
- MUST support icon sizing via CSS custom properties
- MUST support theming (color inheritance)
- Icons MUST be accessible (proper ARIA labels)

---

### DR-4: Theming Support
**Requirement**: Implement CSS custom properties-based theming system.

**Technical Specifications**:
- MUST define all colors, spacing, typography as CSS custom properties
- MUST support light/dark theme switching
- MUST persist theme preference in localStorage
- Theme changes MUST apply without page reload
- SHOULD follow system preference by default (`prefers-color-scheme`)
- Custom properties MUST be defined at `:root` level

**Example Pattern**:
```css
:root {
  --color-background: #ffffff;
  --color-text: #000000;
  --spacing-unit: 8px;
}

[data-theme="dark"] {
  --color-background: #000000;
  --color-text: #ffffff;
}
```

---

### DR-5: Localization (i18n) Support
**Requirement**: Build internationalization support from the start.

**Technical Specifications**:
- MUST separate all user-facing strings into locale files
- MUST support runtime language switching
- MUST use JSON format for translation files (`/locales/{lang}.json`)
- MUST default to English (`en`)
- MUST provide helper function/component for translated strings
- Date, time, and number formatting MUST respect locale
- MUST persist language preference in localStorage

---

### DR-6: Docker Development Environment
**Requirement**: Provide containerized development environment for consistency.

**Technical Specifications**:
- MUST include `Dockerfile` for application container
- MUST include `docker-compose.yml` for full stack (client + Ollama)
- MUST support hot-reload for development
- MUST expose appropriate ports (app server, Ollama API)
- MUST include README section for Docker setup
- MUST mount source code as volume for live editing
- Container MUST run as non-root user

**Required Services**:
- Web server (for HTML/JS/CSS serving)
- Ollama service (LLM runtime)

---

### DR-7: Flash of Unstyled Content (FOUC) Prevention
**Requirement**: Prevent flash of unstyled content during component registration.

**Technical Specifications**:
- MUST define all Web Components BEFORE they appear in DOM
- MUST use `:not(:defined)` CSS to hide undefined components
- SHOULD use `<script>` tags in `<head>` for critical components
- SHOULD show loading state until components ready
- MUST wait for `customElements.whenDefined()` before critical operations

**Pattern**:
```css
:not(:defined) {
  visibility: hidden;
}
```

## Development Guidelines

### Code Organization
```
/src
  /components     # Web Components
  /styles         # Global styles, theme definitions
  /utils          # Utility functions
  /locales        # Translation files
  index.html      # Main application entry
/docker
  Dockerfile
  docker-compose.yml
```

### Best Practices
- Keep components small and focused (single responsibility)
- Use CSS custom properties for all configurable styles
- Emit events up, pass properties down
- Avoid global state where possible
- Document component APIs (attributes, properties, events, slots)

### Component Design Principles
- **Consistency Over Customization**: Reuse existing components even if slightly imperfect
- **Justify New Components**: Document why existing components cannot be extended/reused
- **Visual Unity**: All dialogs look the same, all buttons behave the same, all inputs share styles
- **Theme Integration**: All components MUST respect CSS custom properties for colors, spacing, typography
- **Icon-First**: Use icon + tooltip pattern for common actions to reduce visual clutter

## AI Coder Context

### Critical Constraints
- NO frontend frameworks (React, Vue, Angular, Svelte, etc.)
- NO build step required for development (native ES modules)
- Lucide icons ONLY (no Font Awesome, Material Icons, etc.)
- All components MUST be Web Components
- Docker MUST be the primary development environment

### When Implementing Features
1. Check if semantic HTML is sufficient before creating component
2. Define component before first usage in HTML
3. Use theme variables instead of hardcoded colors
4. Add translated strings to locale files
5. Test in Docker container
