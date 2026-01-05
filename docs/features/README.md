# Features Overview

This folder tracks feature scope, requirements, and progress for Ollama Chat.

## Active Features

- **F-00: Basic Project Setup** (`docs/features/00-basic-project-setup.md`)
  - Project scaffolding, Docker environment, and baseline tooling.
- **F-01: Base Components Library** (`docs/features/01-base-components.md`)
  - Web component foundation (buttons, inputs, dialogs, etc.).
- **F-02: Frontend Client Shell** (`docs/features/02-frontend-client.md`)
  - App shell, chat UI composition, and runtime configuration.
- **F-03: Conversation Projects** (`docs/features/03-conversation-projects.md`)
  - Project entities tied to conversations, file persistence, preview, and export.

## How to Use

- Each feature document maps to requirements in `docs/specification.md` and
  implementation guidance in `docs/development.md`.
- Update change logs as implementation progresses.
- Keep dependencies explicit to avoid cross-feature regressions.
