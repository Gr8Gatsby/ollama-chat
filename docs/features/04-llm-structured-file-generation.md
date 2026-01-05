# Feature: LLM Structured File Generation

## Metadata

**Feature ID**: F-04  
**Status**: 🟡 Design Review  
**Started**: 2026-01-05  
**Dependencies**: F-03 (Conversation Projects)

## Problem Statement

Currently, the LLM generates web projects but lacks proper guidance for component-based architecture with separation of concerns. The existing system:

1. **Returns monolithic HTML files** - The LLM often returns a single large HTML file with inline styles and scripts instead of properly separated files
2. **No application script guidance** - Missing patterns for `app.js` files that coordinate data and component interactions
3. **Unclear component reusability** - Web components are mentioned but not emphasized as the primary building block
4. **No structured response format** - File extraction relies on loose markdown parsing that can miss files
5. **No MVP/incremental development guidance** - LLMs attempt to generate complete applications in one response, leading to token exhaustion, incomplete code, and overwhelming complexity
6. **No project specification tracking** - LLM lacks a living document to track project goals, completed features, and planned enhancements as the conversation evolves

### Current LLM Guidance Issues

The current guidance (app.js:270-290) provides basic structure but lacks:
- Emphasis on component-first architecture
- Application script patterns for state management
- Clear separation between layout HTML and interactive components
- Structured file response format enforcement
- **MVP-first and iterative development patterns** (critical for local LLMs with limited context)
- **Living project specification** to maintain context across conversation turns

### Why This Matters for Local LLMs

Local LLMs have constraints that make incremental development essential:
- **Limited context windows** - Cannot process/generate entire complex applications at once
- **Token generation limits** - Long responses may be truncated or incomplete
- **Quality degradation** - Large generations often include placeholders, TODOs, or broken code
- **User experience** - Waiting for large generations is frustrating; iterative development provides faster feedback

## Goals

1. **Component-First Architecture** - Make Web Components the primary building block
2. **Separation of Concerns** - Clear boundaries between HTML (layout), CSS (styles), app.js (coordination), and components (reusable UI)
3. **Structured File Generation** - Enforce a predictable file response format that ensures all files are captured
4. **Enhanced LLM Guidance** - Provide detailed patterns and examples for building scalable applications
5. **MVP-First Development** - Guide LLMs to build minimal viable products first, then iterate with enhancements
6. **Incremental Complexity** - Start simple, add features one at a time through conversation
7. **Living Project Specification** - Maintain a `project.spec.md` file that tracks goals, features, and progress as the project evolves

## Target Requirements

### From Specification
- Projects should support component-based development (implied by Web Components requirement)
- Files should be properly separated and reusable

### Success Criteria

- [x] Design document reviewed and approved by user
- [ ] LLM consistently generates separate files for HTML, CSS, app.js, and components
- [ ] LLM creates reusable Web Components for all interactive UI elements
- [ ] LLM generates app.js files that coordinate data and component interactions
- [ ] File extraction parser captures 100% of intended files
- [ ] Generated projects follow clear architectural patterns
- [ ] Existing projects continue to work without breaking changes
- [ ] LLM suggests MVP scope for new projects and asks before adding complexity
- [ ] LLM updates individual files without regenerating entire project
- [ ] Users can iterate on projects through multi-turn conversations
- [ ] Project specification file is created and maintained automatically
- [ ] Specification updates reflect new features, completed work, and future plans
- [ ] LLM uses specification to maintain context across long conversations

## Proposed Solution

### 1. Enhanced LLM Guidance Structure

Replace `buildLlmGuidanceMarkdown()` with a comprehensive guidance template that includes:

#### MVP-First Development Philosophy
```markdown
## Development Philosophy: Start Small, Iterate

You are working with a local LLM with limited context. ALWAYS follow this approach:

### For New Projects
1. **Start with MVP (Minimum Viable Product)**
   - Build the simplest working version first
   - Include ONLY core functionality
   - Use placeholder data instead of complex state management
   - Defer features like error handling, loading states, animations

2. **Suggest Scope Before Building**
   - When user requests a project, identify core MVP features
   - List potential enhancements as "next steps"
   - Ask user to confirm MVP scope before generating code
   - Example: "I'll start with: [list]. We can add [features] later. Sound good?"

3. **One Feature at a Time**
   - After MVP, add ONE feature per conversation turn
   - Update only the affected files
   - Don't regenerate unchanged files

### For Existing Projects
1. **Update Individual Files**
   - Only generate files that need changes
   - Reference existing files by name when building on them
   - Don't duplicate unchanged code

2. **Incremental Enhancement**
   - Add one component at a time
   - Extend functionality in small steps
   - Test each change before adding more

### Why This Matters
- **Token limits**: Large responses may be cut off
- **Quality**: Small changes are more accurate than large rewrites
- **Debugging**: Easier to identify issues in focused changes
- **User experience**: Faster iterations, better feedback loop
```

#### Core Architecture Principles
```markdown
## Architecture

Your application should follow this structure:

1. **index.html** - Application layout and shell (semantic HTML only)
   - Contains: <header>, <main>, <nav>, <footer>, etc.
   - No inline scripts or styles
   - References: styles.css, src/app.js

2. **styles.css** - Global styles and design system
   - CSS custom properties for theming
   - Layout utilities (Grid, Flexbox)
   - Typography and spacing scales

3. **src/app.js** - Application coordination and state
   - Import and register all components
   - Handle application-level state and data flow
   - Coordinate component interactions
   - Setup event listeners for cross-component communication

4. **src/components/*.js** - Reusable Web Components
   - One component per file
   - Self-contained with Shadow DOM
   - Accept data via attributes/properties
   - Emit custom events for parent communication
```

#### File Response Format
```markdown
## File Response Format

You MUST respond with files in this exact format:

File: path/to/file.ext
```language
[file content]
```

Example:

File: index.html
```html
<!DOCTYPE html>
<html>
...
</html>
```

File: styles.css
```css
:root {
  --primary: #007bff;
}
```

File: src/app.js
```javascript
import './components/my-component.js';

class App {
  constructor() {
    this.init();
  }
  
  init() {
    // Setup app
  }
}

new App();
```

File: src/components/my-component.js
```javascript
class MyComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
      </style>
      <div>Component content</div>
    `;
  }
}

customElements.define('my-component', MyComponent);
```
```

#### Component Patterns
```markdown
## Component Patterns

### Basic Component Template
```javascript
class ComponentName extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }
  
  disconnectedCallback() {
    // Cleanup
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        /* Component-specific styles */
      </style>
      <div class="component-root">
        <!-- Component markup -->
      </div>
    `;
  }
  
  attachEventListeners() {
    // Setup listeners
  }
}

customElements.define('component-name', ComponentName);
```

### Component with Properties
```javascript
class UserCard extends HTMLElement {
  static get observedAttributes() {
    return ['name', 'email'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }
  
  render() {
    const name = this.getAttribute('name') || 'Unknown';
    const email = this.getAttribute('email') || '';
    
    this.shadowRoot.innerHTML = `
      <style>
        .user-card {
          border: 1px solid #ccc;
          padding: 1rem;
          border-radius: 8px;
        }
      </style>
      <div class="user-card">
        <h3>${name}</h3>
        <p>${email}</p>
      </div>
    `;
  }
}
```

### Component with Events
```javascript
class CustomButton extends HTMLElement {
  connectedCallback() {
    this.render();
    
    this.shadowRoot.querySelector('button').addEventListener('click', () => {
      // Emit custom event to parent
      this.dispatchEvent(new CustomEvent('button-clicked', {
        bubbles: true,
        composed: true,
        detail: { id: this.getAttribute('id') }
      }));
    });
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        button {
          padding: 0.5rem 1rem;
          background: var(--primary, #007bff);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      </style>
      <button>
        <slot>Click me</slot>
      </button>
    `;
  }
}
```
```

#### Application Coordination Patterns
```markdown
## Application Coordination (app.js)

Your app.js should handle:

1. **Component Registration**
```javascript
// Import all components
import './components/user-card.js';
import './components/custom-button.js';
import './components/data-table.js';

// Components are auto-registered via customElements.define()
```

2. **Application State**
```javascript
class AppState {
  constructor() {
    this.data = [];
    this.listeners = [];
  }
  
  subscribe(callback) {
    this.listeners.push(callback);
  }
  
  setState(newState) {
    this.data = newState;
    this.notify();
  }
  
  notify() {
    this.listeners.forEach(callback => callback(this.data));
  }
}

const appState = new AppState();
```

3. **Component Communication**
```javascript
// Listen for component events
document.addEventListener('button-clicked', (e) => {
  console.log('Button clicked:', e.detail);
  // Update state, trigger actions, etc.
});

// Update components when state changes
appState.subscribe((data) => {
  const table = document.querySelector('data-table');
  if (table) {
    table.setAttribute('data', JSON.stringify(data));
  }
});
```

4. **Data Fetching and API Integration**
```javascript
class DataService {
  async fetchUsers() {
    const response = await fetch('/api/users');
    return response.json();
  }
  
  async createUser(userData) {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  }
}

const dataService = new DataService();
```
```

### 2. Improved File Extraction Parser

Enhance `extractFilesFromContent()` in app.js to:

1. **Enforce Structured Format** - Require `File: path` declarations before code blocks
2. **Validate File Paths** - Ensure paths don't contain `..` or absolute paths
3. **Track Missing Files** - Log warnings if expected files (index.html, app.js) are missing
4. **Better Error Handling** - Provide feedback when file extraction fails

```javascript
extractFilesFromContent(content) {
  const files = [];
  const filePattern = /^File:\s*(.+?)$/im;
  const codeBlockPattern = /```(\w+)?\n([\s\S]*?)```/g;
  
  let currentFilePath = null;
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fileMatch = line.match(filePattern);
    
    if (fileMatch) {
      // Validate path
      const path = fileMatch[1].trim();
      if (path.includes('..') || path.startsWith('/')) {
        console.warn(`Invalid file path: ${path}`);
        continue;
      }
      currentFilePath = path;
    }
  }
  
  // Extract code blocks and match with file paths
  let match;
  const codeBlocks = [];
  while ((match = codeBlockPattern.exec(content)) !== null) {
    codeBlocks.push({
      language: match[1] || 'text',
      content: match[2].trim(),
      index: match.index
    });
  }
  
  // Match file paths to code blocks based on proximity
  // (Implementation details...)
  
  return files;
}
```

### 3. System Context Enhancement

Update the system context sent to the LLM (app.js:851-860) to include:

1. **Architecture Overview** - Brief summary of component-first approach
2. **File Structure** - Current project files organized by type
3. **Missing Files** - Explicitly list expected files that don't exist yet
4. **Incremental Development Reminder** - Reinforce MVP-first approach

```javascript
buildSystemContext(project, files, manifest) {
  const existingFiles = files
    .filter(f => !f.path.startsWith('project.'))
    .map(f => f.path);
  
  const filesByType = {
    layout: existingFiles.filter(p => p.endsWith('.html')),
    styles: existingFiles.filter(p => p.endsWith('.css')),
    app: existingFiles.filter(p => p === 'src/app.js'),
    components: existingFiles.filter(p => p.startsWith('src/components/'))
  };
  
  const expectedFiles = ['index.html', 'styles.css', 'src/app.js'];
  const missingFiles = expectedFiles.filter(f => !existingFiles.includes(f));
  
  const isNewProject = existingFiles.length === 0;
  const hasExistingFiles = existingFiles.length > 0;
  
  return `## Project Architecture

Component-first web application with separation of concerns.

### Current Files (${existingFiles.length})

Layout: ${filesByType.layout.join(', ') || 'None'}
Styles: ${filesByType.styles.join(', ') || 'None'}
App: ${filesByType.app.join(', ') || 'None'}
Components: ${filesByType.components.length} component(s)
${filesByType.components.length > 0 ? `\n  ${filesByType.components.map(c => `- ${c}`).join('\n  ')}` : ''}

${missingFiles.length > 0 ? `\n### Missing Core Files\n${missingFiles.map(f => `- ${f}`).join('\n')}` : ''}

### Development Approach

${isNewProject ? `**New Project**: Start with MVP. Only generate core files needed for basic functionality.
- Suggest scope before building
- Use placeholder data instead of complex state
- Defer advanced features for later iterations` : ''}

${hasExistingFiles ? `**Existing Project**: Update only what's needed.
- Generate ONLY files that need changes
- Reference existing files by path (don't regenerate)
- Add features incrementally` : ''}

### File Manifest
${JSON.stringify(manifest, null, 2)}

**Important**: Generate files using structured format (File: path followed by code block).
${hasExistingFiles ? 'Only include files you are creating or modifying.' : ''}
`;
}
```

### 4. Validation and Feedback

Add post-generation validation to provide feedback:

```javascript
async validateProjectStructure(projectId) {
  const files = await getProjectFiles(projectId);
  const paths = files.map(f => f.path);
  
  const warnings = [];
  const recommendations = [];
  
  // Check for required files
  if (!paths.includes('index.html')) {
    warnings.push('Missing index.html - application may not load');
  }
  
  if (!paths.includes('src/app.js')) {
    recommendations.push('Consider creating src/app.js to coordinate components');
  }
  
  // Check for components
  const components = paths.filter(p => p.startsWith('src/components/'));
  if (components.length === 0 && paths.length > 2) {
    recommendations.push('Consider extracting reusable components to src/components/');
  }
  
  // Check for inline scripts in HTML
  const indexHtml = files.find(f => f.path === 'index.html');
  if (indexHtml && indexHtml.content.includes('<script>')) {
    recommendations.push('Move inline scripts to src/app.js for better maintainability');
  }
  
  return { warnings, recommendations };
}
```

### 5. MVP Conversation Examples

Add examples to the guidance showing ideal conversation patterns:

```markdown
## MVP Development Examples

### Example 1: New Todo App

**User**: "Build me a todo list app"

**LLM Response**: "I'll build a minimal todo app with these MVP features:
- Display a list of todos
- Add new todos via input field
- Mark todos as complete (toggle)

We can add later:
- Delete todos
- Edit existing todos
- Filter by status (all/active/completed)
- Local storage persistence
- Due dates and priorities

Sound good? I'll keep it simple with placeholder data for now."

**Then generate**: index.html, styles.css, src/app.js, src/components/todo-list.js, src/components/todo-item.js

---

### Example 2: Iterating on Existing Project

**User**: "Add the ability to delete todos"

**LLM Response**: "I'll update the todo-item component to include a delete button and emit a delete event. Here are the files that need changes:"

**Then generate**: Only src/components/todo-item.js and src/app.js (to handle the delete event)

---

### Example 3: User Requests Too Much

**User**: "Build a full e-commerce site with shopping cart, payment processing, user authentication, product reviews, and admin dashboard"

**LLM Response**: "That's a complex project! Let's start with an MVP that we can build on:

**MVP Phase 1** (I'll build now):
- Product listing page
- Basic product cards with image, title, price
- Simple product detail view
- Mock data (no API yet)

**Phase 2** (next iteration):
- Shopping cart component
- Add/remove items from cart
- Cart total calculation

**Phase 3** (future):
- User authentication
- Checkout flow
- Payment integration

**Phase 4** (future):
- Product reviews
- Admin dashboard

Should I proceed with Phase 1?"
```

### 6. Living Project Specification

Introduce a `project.spec.md` file that the LLM maintains throughout the conversation lifecycle.

#### Specification File Structure

```markdown
# Project Specification: [Project Name]

## Overview
Brief description of what this project is and its purpose.

## Current Status
**Phase**: [MVP | Enhancement | Maintenance]
**Last Updated**: [Conversation turn or timestamp]

## Completed Features
- [x] Feature 1 - Brief description
- [x] Feature 2 - Brief description

## Current Scope (In Progress)
- [ ] Feature being worked on now
- [ ] Related tasks for current feature

## Planned Enhancements
Priority-ordered list of future features:

### High Priority
- Feature A - Why it's important
- Feature B - Why it's important

### Medium Priority
- Feature C
- Feature D

### Future Considerations
- Feature E - Nice to have
- Feature F - Deferred for later

## Technical Notes
- Key architectural decisions
- External dependencies or APIs
- Data models or state structure
- Performance considerations

## Files
List of current project files and their purpose:
- `index.html` - Application shell
- `styles.css` - Global styles and design system
- `src/app.js` - Application coordination
- `src/components/component-name.js` - [Brief description]

## Changelog
Track all changes to the project specification and implementation.

### [Date/Turn] - Feature/Change Name
**Changed**:
- What was modified in the project
- Which files were updated
- Any architectural decisions made

**Added to Spec**:
- New features added to planned enhancements
- Updates to technical notes
```

#### When to Update the Specification

The LLM should update `project.spec.md` when:

1. **Project Creation** - Initial spec with MVP scope + first changelog entry
2. **Feature Completion** - Move item from "Current Scope" to "Completed Features" + add changelog entry
3. **New Feature Requested** - Add to "Planned Enhancements" or "Current Scope" + add changelog entry
4. **Scope Clarification** - User provides new requirements or constraints + add changelog entry
5. **Technical Decisions** - Important architectural choices made + document in changelog
6. **File Structure Changes** - New components or major refactoring + add changelog entry

**Every update to the specification must include a corresponding changelog entry** showing what changed and why.

#### Specification Update Pattern

```markdown
## Example Specification Updates

### Initial Project Creation

File: project.spec.md
```markdown
# Project Specification: Todo List App

## Overview
A simple todo list application for managing daily tasks.

## Current Status
**Phase**: MVP
**Last Updated**: Conversation start

## Completed Features
None yet - project just created

## Current Scope (In Progress)
- [ ] Display list of todos
- [ ] Add new todos via input field
- [ ] Mark todos as complete (toggle)

## Planned Enhancements

### High Priority
- Delete todos
- Edit existing todos
- Filter by status (all/active/completed)

### Medium Priority
- Local storage persistence
- Drag and drop reordering

### Future Considerations
- Due dates and priorities
- Multiple todo lists
- Cloud sync

## Technical Notes
- Using Web Components for modularity
- Placeholder data array for MVP
- No backend/API for now

## Files
- `index.html` - Application layout
- `styles.css` - Global styles
- `src/app.js` - App initialization and state
- `src/components/todo-list.js` - Todo list container
- `src/components/todo-item.js` - Individual todo items

## Changelog

### Initial Creation - MVP Setup
**Changed**:
- Created project structure with 5 files
- Implemented basic todo display and add functionality
- Set up Web Component architecture

**Added to Spec**:
- Defined MVP scope (display, add, toggle)
- Listed high-priority enhancements (delete, edit, filter)
- Documented technical approach (Web Components, in-memory state)
```
```

### After First Feature Addition

File: project.spec.md
```markdown
# Project Specification: Todo List App

## Overview
A simple todo list application for managing daily tasks.

## Current Status
**Phase**: Enhancement
**Last Updated**: After adding delete functionality

## Completed Features
- [x] Display list of todos
- [x] Add new todos via input field
- [x] Mark todos as complete (toggle)
- [x] Delete todos

## Current Scope (In Progress)
- [ ] Edit existing todos (inline editing)

## Planned Enhancements

### High Priority
- Filter by status (all/active/completed)
- Local storage persistence

### Medium Priority
- Drag and drop reordering
- Todo count display

### Future Considerations
- Due dates and priorities
- Multiple todo lists
- Cloud sync

## Technical Notes
- Using Web Components for modularity
- State management via app.js with event-based communication
- Components emit custom events (add, delete, toggle, edit)
- No backend/API - all data in memory

## Files
- `index.html` - Application layout
- `styles.css` - Global styles
- `src/app.js` - App initialization and state (updated for delete)
- `src/components/todo-list.js` - Todo list container
- `src/components/todo-item.js` - Individual todo items (updated with delete button)

## Changelog

### Initial Creation - MVP Setup
**Changed**:
- Created project structure with 5 files
- Implemented basic todo display and add functionality
- Set up Web Component architecture

**Added to Spec**:
- Defined MVP scope (display, add, toggle)
- Listed high-priority enhancements (delete, edit, filter)
- Documented technical approach (Web Components, in-memory state)

### After Adding Delete Functionality
**Changed**:
- Updated `todo-item.js` to include delete button
- Modified `app.js` to handle delete events
- Enhanced event-based communication pattern

**Added to Spec**:
- Moved "Delete todos" from Planned to Completed
- Added "Todo count display" to Medium Priority
- Updated technical notes about event communication
```
```

#### Integration with System Context

The specification should be included in the system context sent to the LLM:

```javascript
buildSystemContext(project, files, manifest) {
  // ... existing code ...
  
  // Get specification if it exists
  const specFile = files.find(f => f.path === 'project.spec.md');
  const specification = specFile ? specFile.content : null;
  
  return `## Project Architecture
  
${specification ? `### Project Specification\n${specification}\n\n` : ''}

### Current Files (${existingFiles.length})
// ... rest of context
`;
}
```

#### LLM Guidance for Specification Maintenance

Add to the LLM guidance:

```markdown
## Project Specification Management

You MUST maintain the `project.spec.md` file to track project evolution:

### When Creating a New Project
1. Ask user to clarify MVP scope
2. Create initial `project.spec.md` with:
   - Overview of what the project is
   - Current scope (MVP features)
   - Planned enhancements (future features)
   - Technical notes (architecture decisions)

### After Each Feature Implementation
1. Update `project.spec.md`:
   - Move completed items from "Current Scope" to "Completed Features"
   - Add newly discovered features to "Planned Enhancements"
   - Update "Files" section if structure changed
   - Add any technical notes or decisions made
   - **Add changelog entry** documenting what changed and what was added to the spec

### When User Requests New Features
1. Add to "Planned Enhancements" section
2. If starting work immediately, move to "Current Scope"
3. Update "Last Updated" timestamp
4. **Add changelog entry** noting the new feature request and where it was added

### Keep It Concise
- Specification should be brief (1-2 pages max)
- Focus on what's important for context
- Don't duplicate code or implementation details
- Use bullet points and clear sections

### Use It for Context
- Review specification at start of each conversation turn
- Reference it when making architectural decisions
- Use it to avoid scope creep and stay focused
```

#### Benefits of Living Specification with Changelog

1. **Context Preservation** - LLM can see project history without full conversation replay
2. **Scope Management** - Clear tracking of what's done vs. what's planned
3. **User Visibility** - Users can see project roadmap and progress
4. **Incremental Development** - Natural breaking points between features
5. **Decision History** - Technical notes capture why choices were made
6. **Onboarding** - New conversations can quickly understand project state
7. **Audit Trail** - Changelog provides complete evolution history of the project
8. **Change Attribution** - Clear record of what changed, when, and why
9. **Rollback Reference** - If issues arise, changelog helps identify when changes were introduced
10. **Learning Resource** - Users can review changelog to understand how project developed

## Implementation Plan

### Phase 1: Enhanced Guidance Template
1. Create new comprehensive LLM guidance template
2. Update `buildLlmGuidanceMarkdown()` with new structure
3. Include:
   - MVP-first development philosophy
   - Architecture principles
   - File response format requirements
   - Component patterns (basic, with properties, with events)
   - App.js coordination patterns
   - Specification management instructions
4. Test with sample LLM requests to validate clarity

### Phase 2: Project Specification System
1. Create specification file structure template
2. Add `buildProjectSpecification()` method for initial spec creation
3. Update file extraction to recognize `project.spec.md` as special file
4. Integrate specification into system context
5. Add specification update detection and persistence
6. Test specification lifecycle (create → update → reference)

### Phase 3: Improved File Extraction
1. Enhance `extractFilesFromContent()` parser
2. Add path validation and sanitization
3. Implement better code block-to-file matching
4. Add logging for debugging file extraction issues
5. Handle specification file updates specially

### Phase 4: System Context Enhancement
1. Create `buildSystemContext()` method
2. Include project specification at top of context
3. Organize files by type (layout, styles, app, components)
4. Identify missing core files
5. Add incremental development reminders based on project state
6. Update `handleSend()` to use enhanced context

### Phase 5: Validation System
1. Create `validateProjectStructure()` method
2. Check for specification file and warn if missing
3. Validate specification format and completeness
4. Run validation after file persistence
5. Display warnings/recommendations in UI (optional)
6. Log validation results for debugging

### Phase 6: Testing and Refinement
1. Test MVP workflow: new project → scope clarification → MVP generation → iteration
2. Test specification updates across multiple conversation turns
3. Test with various project types (simple app, data-driven app, multi-component app)
4. Verify file extraction works for all patterns
5. Ensure backward compatibility with existing projects
6. Test specification-based context preservation
7. Gather feedback and iterate on guidance wording

### Phase 7: Documentation
1. Update project guidance examples in docs
2. Create example projects showcasing best practices
3. Document component patterns for reference
4. Document specification structure and best practices
5. Update development.md with architectural guidelines
6. Create user guide for iterative development workflow

## Migration Strategy

### Backward Compatibility
- Existing projects continue to work without changes
- Parser supports both old and new file formats
- No database schema changes required
- Optional validation system doesn't block functionality

### Opt-In Enhancement
- New projects automatically get enhanced guidance
- Users can manually update `project.guidance.md` for existing projects
- System prompts enhanced but don't break old patterns

### Rollback Plan
- Keep old `buildLlmGuidanceMarkdown()` as fallback
- Feature flag to toggle enhanced guidance
- Monitor file extraction success rates

## Technical Considerations

### File Extraction Reliability
- **Challenge**: Code blocks without `File:` declarations
- **Solution**: Enhanced parser that matches blocks to nearest file declaration
- **Fallback**: Existing language-based inference (html → index.html, etc.)

### LLM Consistency
- **Challenge**: LLMs may ignore structured format requirements
- **Solution**: Clear examples, repeated reinforcement in guidance, system context
- **Monitoring**: Track extraction success rates, log failed parses

### Component Complexity
- **Challenge**: Overly complex component patterns may confuse LLMs
- **Solution**: Provide graduated examples (basic → intermediate → advanced)
- **Balance**: Keep patterns simple enough for LLMs to reproduce reliably

### Performance
- **Challenge**: Enhanced system context increases token usage
- **Solution**: Keep context concise, only include relevant file info
- **Optimization**: Summarize large file lists, omit file contents from context

## Success Metrics

1. **File Separation Rate** - % of projects with separate HTML, CSS, app.js files (target: >90%)
2. **Component Creation Rate** - % of projects with at least one Web Component (target: >80%)
3. **File Extraction Success** - % of LLM responses where all files are captured (target: >95%)
4. **User Satisfaction** - Qualitative feedback on project quality and structure
5. **Zero Regressions** - No existing projects break after enhancement

## Open Questions

1. **Should we enforce file structure?** - Or just encourage it through guidance?
2. **How strict should path validation be?** - Allow arbitrary nesting or limit depth?
3. **Should app.js be required?** - Or optional for simple projects?
4. **Component library?** - Should we provide pre-built components for common patterns?
5. **Template projects?** - Should users be able to start from templates (SPA, dashboard, etc.)?
6. **Specification format flexibility?** - Should we allow custom sections or enforce strict structure?
7. **Specification update frequency?** - Update after every change or only at major milestones?
8. **How to handle specification conflicts?** - What if LLM and user have different views of project state?
9. **Specification versioning?** - Should we track specification history or just current state?
10. **Should specification be user-editable?** - Can users manually update it to guide LLM behavior?

## Alternative Approaches Considered

### Approach 1: JSON Response Format
- **Pros**: Structured, unambiguous, easy to parse
- **Cons**: Harder for LLMs to generate, less readable for users, breaks streaming display
- **Decision**: Rejected - markdown is more natural for LLMs

### Approach 2: File-by-File Generation
- **Pros**: Guaranteed separation, explicit file creation
- **Cons**: Slower, more requests, disrupts conversation flow
- **Decision**: Rejected - current streaming approach is better UX

### Approach 3: Build System Integration
- **Pros**: Could bundle/minify, add TypeScript support
- **Cons**: Violates "no-build" requirement, adds complexity
- **Decision**: Rejected - out of scope for this feature

## Summary

This feature enhancement addresses a critical gap in how local LLMs generate and maintain web projects. The core insight is that **incremental development is essential for local LLMs** due to context window limits and token generation constraints.

### Key Changes

1. **MVP-First Philosophy** - Guide LLMs to start small and iterate, not generate entire applications at once
2. **Living Project Specification** - `project.spec.md` file that tracks goals, progress, and plans
3. **Component-First Architecture** - Emphasis on reusable Web Components over monolithic files
4. **Enhanced System Context** - Send specification + file structure to maintain context across turns
5. **Incremental File Updates** - Only generate changed files, not entire projects
6. **Conversation Patterns** - Examples showing how to break down complex requests into MVPs

### Expected Impact

- **Better code quality** - Smaller generations are more accurate, complete, and maintainable
- **Faster iterations** - Users get working MVPs quickly, then enhance incrementally
- **Context preservation** - Specification file maintains project history without full conversation replay
- **Reduced frustration** - No more truncated responses or incomplete code
- **Clear roadmaps** - Users and LLMs both understand current state and next steps

### User Experience Flow

```
User: "Build a todo app"
  ↓
LLM: "I'll start with MVP: display, add, toggle. We can add delete/edit/filters later. OK?"
  ↓
User: "Yes"
  ↓
LLM generates: project.spec.md, index.html, styles.css, app.js, 2 components
  ↓
User: "Add delete functionality"
  ↓
LLM updates: project.spec.md (mark feature complete), todo-item.js, app.js
  ↓
Project evolves iteratively with clear tracking
```

## Change Log

### 2026-01-05 - Initial Feature Document Created
**Agent**: Claude (Sonnet 4.5)
- Created comprehensive design document for structured file generation
- Analyzed current LLM guidance and file extraction system
- Proposed enhanced guidance template with component-first architecture
- Defined implementation plan with 7 phases
- Established success criteria and metrics
- Identified open questions for user review

### 2026-01-05 - Added MVP-First Development and Project Specification
**Agent**: Claude (Sonnet 4.5)
- Incorporated user feedback about complex project handling and local LLM constraints
- Added MVP-first development philosophy to guidance
- Designed living project specification system (`project.spec.md`)
- Created specification structure, update patterns, and integration with system context
- Added conversation examples showing incremental development patterns
- Updated implementation plan to include specification system (now 7 phases)
- Added new open questions about specification management

### 2026-01-05 - Added Changelog to Project Specification
**Agent**: Claude (Sonnet 4.5)
- Incorporated user feedback about tracking specification changes over time
- Added Changelog section to specification structure
- Defined changelog entry format (Changed + Added to Spec)
- Updated specification update triggers to require changelog entries
- Enhanced example specifications with changelog entries showing evolution
- Added benefits of changelog (audit trail, change attribution, rollback reference)
- Updated LLM guidance to mandate changelog updates with every spec change
