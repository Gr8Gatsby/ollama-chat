# Feature: Basic Project Setup

## Metadata

**Feature ID**: F-00  
**Status**: In Progress  
**Started**: 2026-01-01  
**Target Completion**: 2026-01-01  
**Dependencies**: None (foundational feature)

## Target Requirements

### From Specification
None directly - this is foundational infrastructure

### From Development Specification
- **DR-6**: Docker Development Environment
- **DR-8**: Backend WebSocket Server (skeleton only)
- **DR-9**: Database Schema and Persistence (initialization only)

## Success Criteria

- [ ] Docker Compose configuration with 3 services (frontend, backend, ollama)
- [ ] Makefile with essential targets (dev, start, stop, logs, setup)
- [ ] Backend WebSocket server runs and accepts connections
- [ ] Database initializes with correct schema
- [ ] All services pass health checks
- [ ] `make setup` works for first-time setup
- [ ] `make dev` starts all services successfully

## Implementation Plan

### Phase 1: Project Structure
1. Create directory structure:
   - `src/` - Frontend source files
   - `server/` - Backend Node.js server
   - `docker/` - Dockerfile configurations
   - `data/` - SQLite database storage (gitignored)

### Phase 2: Docker Configuration
1. Create `docker/Dockerfile.frontend` - nginx for static files
2. Create `docker/Dockerfile.backend` - Node.js runtime
3. Create `docker-compose.yml` - 3 services with networks and volumes
4. Create `docker-compose.dev.yml` - Development overrides

### Phase 3: Backend Server Skeleton
1. Create `server/package.json` - Node.js dependencies
2. Create `server/index.js` - Basic WebSocket server
3. Create `server/db/init.js` - Database initialization
4. Create `server/db/schema.sql` - Complete database schema

### Phase 4: Frontend Skeleton
1. Create `src/index.html` - Minimal HTML structure
2. Create `src/styles/reset.css` - CSS reset
3. Create nginx configuration for frontend

### Phase 5: Build System
1. Create `Makefile` with all essential targets
2. Create `.gitignore` for data/, node_modules/, etc.

### Phase 6: Validation
1. Test `make setup` - first-time setup flow
2. Test `make dev` - start all services
3. Verify health checks pass
4. Verify WebSocket connection works
5. Verify database schema is correct

## Implementation Notes

- Keep everything minimal for now - no UI components yet
- Focus on getting infrastructure working
- Backend should just echo WebSocket messages for now
- Frontend should just be static HTML placeholder
- Database should initialize but remain empty

## Change Log

### 2026-01-01 - Initial Feature Document Created
**Agent**: Claude (Sonnet 4.5)
- Created feature document with metadata and implementation plan
- Defined success criteria based on DR-6, DR-8, DR-9
- Outlined 6-phase implementation approach

### 2026-01-01 - Initial Implementation Complete
**Agent**: Claude (Sonnet 4.5)
- Implemented all 6 phases of basic project setup
- Created Docker configurations (frontend nginx, backend Node.js, ollama)
- Implemented WebSocket server skeleton with echo functionality
- Created complete SQLite schema initialization
- Built frontend test page with WebSocket connection testing
- Created Makefile with 20+ development targets
- All Docker images build successfully

### 2026-01-01 - Project Structure Refactored
**Agent**: Claude (Sonnet 4.5)
- Refactored project structure based on user feedback
- **Old structure**: `src/` (frontend only), `server/` (backend)
- **New structure**: `src/frontend/`, `src/backend/`, `src/shared/`, `build/`
- **Rationale**: Semantic clarity, build process consistency, future scalability
- Added build process: `make build-src` copies source to `build/` directory
- Updated Docker configurations to use `build/` output instead of raw source
- Updated docker-compose volume mounts for new structure
- Added `make clean-build` target to remove build artifacts
- Verified build process works correctly
- **Benefits**: Prepared for future bundling/minification, clearer separation of source vs artifacts
