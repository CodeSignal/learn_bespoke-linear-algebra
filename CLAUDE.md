# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

This is **Interactive Linear Algebra** - an educational web application for teaching linear algebra concepts through visual experimentation. The application supports three interaction modes:

- **Vector Mode**: Draw vectors on a 2D Cartesian plane and perform operations (addition, subtraction, scalar multiplication, dot products, projections) with smooth animated visualizations
- **Matrix Mode**: Visualize 2×2 matrix transformations and their effects on basis vectors
- **Tensor Mode**: Explore tensors of different ranks (0-3) in an interactive 3D space with drag-to-rotate and scroll-to-zoom controls

This application also serves as a reference implementation of the **Bespoke framework** - a reusable set of generalized CSS and JavaScript components designed for building embedded educational applications.

**Agent protocol:** Before making any change, Claude Code must read the root
`AGENTS.md` plus every nested `AGENTS.md` that covers the files being edited
(`client/`, `client/core/`, `client/modes/`, etc.). Treat those documents and
`BESPOKE.md` as hard requirements, not suggestions.

## Quick Start

```bash
# Install dependencies (optional - only needed for WebSocket support)
npm install

# Start development server
npm start
# OR
node server.js
```

Access the application at `http://localhost:3000`

No build step required - this is pure HTML/CSS/JavaScript with no frameworks or build tools.

## Key Architecture

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3
- **Backend**: Node.js HTTP server with optional WebSocket support
- **Design Philosophy**: No frameworks, no build tools - educational clarity through simplicity

### Core Components

1. **Vector Class** (`client/core/vector.js`)
   - Encapsulates mathematical vector operations
   - Methods: add, subtract, scale, dot, normalize, project, reflect

2. **Mode System** (`client/core/mode-manager.js`, `client/modes/`)
   - Three modes: VectorMode, MatrixMode, TensorMode
   - Each mode is a controller managing its own UI, canvas rendering, and interactions
   - Modes subscribe to theme changes and clean up properly on destroy
   - See `client/modes/AGENTS.md` for detailed implementation contracts

3. **TensorMode** (`client/modes/tensor-mode.js`, `client/modes/tensor-canvas-3d.js`)
   - Visualizes tensors of ranks 0-3 in interactive 3D space
   - Uses `TensorCanvas3D` for 3D rendering with mouse drag rotation and scroll zoom
   - Supports scalar, vector, matrix, and 3D tensor inputs
   - See `client/modes/AGENTS.md` for lifecycle and teardown requirements

4. **HelpModal** (`client/help-modal.js`)
   - Reusable modal component with theme support
   - Singleton pattern with event handling
   - Mode-specific help content loaded from `help-content-*.html` files

5. **Status Management** (`client/core/status.js`, `client/app.js`)
   - Standardized status messaging system
   - WebSocket client for real-time updates (optional)

### File Loading Order

The HTML must load scripts in this exact order:
1. `bespoke.css` - Core styling framework
2. `help-modal.js` - Help system component
3. `app.js` - WebSocket/status management
4. `linear-algebra.js` - Main application logic

## Bespoke Framework Reference

**IMPORTANT**: For detailed implementation instructions, CSS components, naming conventions, and best practices, refer to `AGENTS.md` - the single source of truth for:
- HTML template structure and placeholders
- CSS custom properties and theming
- Component usage (headers, cards, forms, modals, buttons)
- Error handling requirements
- Status message conventions
- File naming conventions

## Development

### Testing
- Main application: `http://localhost:3000`
- Component testing: `http://localhost:3000/test-integration.html`
- No formal test suite - manual testing via browser

### WebSocket API
The server provides a `POST /message` endpoint to send alerts to connected clients:
```bash
curl -X POST http://localhost:3000/message -H "Content-Type: application/json" -d '{"message":"Test alert"}'
```

## Important Conventions

### File Naming
- All files use kebab-case: `linear-algebra.js`, `help-modal.js`, `bespoke.css`

### Status Messages
Use standardized messages for consistency:
- "Ready" - Application loaded successfully
- "Loading..." - Data is being loaded
- "Saving..." - Data is being saved
- "Changes saved" - Save completed successfully
- "Failed to load data" - Loading failed

### Code Organization
- Configuration objects at the top of files
- Class-based organization for main components
- IIFE wrapping for encapsulation where appropriate
- camelCase for variables/functions, PascalCase for classes

### CSS Scoping
All Bespoke styles are scoped under `.bespoke` class to prevent conflicts when embedded in other websites.

## Project Structure

```
client/
├── bespoke.css              # Core CSS framework
├── help-modal.js            # Reusable help modal
├── app.js                   # WebSocket & status handling
├── linear-algebra.js        # Main app logic
├── config.json              # Application configuration (modes, operations)
├── core/                    # Shared services
│   ├── mode-manager.js      # Mode switching system
│   ├── theme-service.js     # Theme management
│   ├── coordinate-system.js # Coordinate system
│   └── ...                  # Other core services
├── modes/                   # Mode controllers
│   ├── vector-mode.js       # Vector mode controller
│   ├── matrix-mode.js       # Matrix mode controller
│   ├── tensor-mode.js       # Tensor mode controller
│   └── tensor-canvas-3d.js  # 3D canvas renderer for tensor mode
├── help-content-*.html      # Mode-specific help content
└── index.html               # Main HTML structure

server.js                    # Development server
AGENTS.md                    # Bespoke framework implementation guide
client/modes/AGENTS.md       # Mode implementation contracts
```
