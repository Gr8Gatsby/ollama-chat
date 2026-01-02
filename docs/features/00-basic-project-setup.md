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
