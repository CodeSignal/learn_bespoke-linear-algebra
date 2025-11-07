# Interactive Linear Algebra

An interactive educational tool for learning vector operations through visual experimentation. Draw vectors on a 2D Cartesian plane and perform operations like addition, subtraction, scalar multiplication, and dot products with smooth animated visualizations.

![Interactive Linear Algebra](https://img.shields.io/badge/educational-tool-blue) ![Built with Vanilla JS](https://img.shields.io/badge/built%20with-vanilla%20js-yellow)

## Features

### Core Functionality
- **Interactive Vector Creation**: Click and drag on the grid to create vectors (up to 2 simultaneously)
- **Real-time Calculations**: View coordinates, magnitude, and angle for each vector
- **Animated Operations**: Smooth transitions showing vector transformations
- **Formula Display**: Mathematical formulas and calculations shown for each operation

### Supported Operations
- ✅ **Vector Addition** (v₁ + v₂)
- ✅ **Vector Subtraction** (v₁ - v₂)
- ✅ **Scalar Multiplication** (with custom scalar values)
- ✅ **Dot Product** (v₁ · v₂)
- ✅ **Magnitude Calculation** (||v||)
- ✅ **Angle Measurement** (in degrees from positive x-axis)

### User Interface
- **Left Sidebar**: Control panel with vector information and operation buttons
- **Main Canvas**: Full-screen 2D Cartesian plane with grid
- **No Scrolling**: Fully responsive, single-page layout
- **Help System**: Comprehensive help modal with instructions and FAQ

## Quick Start

1. **Start the development server**:
   ```bash
   npm start
   ```
   Server runs at `http://localhost:3000`

2. **Create vectors**:
   - Click and drag anywhere on the grid
   - First vector (v₁) will be red
   - Second vector (v₂) will be blue

3. **Perform operations**:
   - Use buttons in the left sidebar
   - Watch animated results
   - Read formulas in the Results section

4. **Clear and experiment**:
   - Clear individual vectors or all at once
   - Try different vector configurations

## Project Structure

```
learn-bespoke-linear-algebra/
├── client/
│   ├── index.html                    # Main HTML structure
│   ├── bespoke.css                   # Core CSS framework
│   ├── linear-algebra.css            # App-specific styles
│   ├── linear-algebra.js             # Main application logic
│   ├── help-modal.js                 # Help modal component
│   ├── help-content-template.html    # Help content
│   └── app.js                        # WebSocket/status handling
├── server.js                         # Development server
├── package.json                      # Dependencies
└── README.md                         # This file
```

## Technical Details

### Technologies Used
- **Frontend**: Vanilla JavaScript (ES6+), HTML5 Canvas, CSS3
- **Backend**: Node.js (development server)
- **No Frameworks**: Pure JavaScript for educational clarity

### Key Classes and Components

#### `LinearAlgebraApp`
Main application class managing:
- Canvas rendering and coordinate system
- Vector creation and manipulation
- Mouse interaction handling
- Animation system
- UI updates

#### `Vector`
Mathematical vector class with:
- Component storage (x, y)
- Operations (add, subtract, scale, dot)
- Calculation methods (magnitude, angle)

#### Canvas System
- Cartesian coordinate system with origin at center
- Grid rendering with axis labels
- Coordinate transformation (screen ↔ mathematical)
- High DPI display support

### Configuration
Edit `CONFIG` object in `linear-algebra.js`:
```javascript
const CONFIG = {
  gridSize: 40,           // pixels per unit
  arrowHeadSize: 12,      // pixels
  vectorLineWidth: 3,
  animationDuration: 800, // milliseconds
  colors: {
    vector1: '#ef4444',   // red
    vector2: '#3b82f6',   // blue
    result: '#10b981',    // green
    // ...
  }
};
```

## Educational Use Cases

- **Linear Algebra Courses**: Visual supplement to theoretical concepts
- **Physics Education**: Understanding force vectors and motion
- **Computer Graphics**: Intuition for vector operations
- **Self-Study**: Interactive exploration of vector mathematics

## Browser Support

Modern browsers with Canvas support:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

---

## Template Components (Bespoke Framework)

### 1. `client/bespoke.css`
The core CSS framework providing:
- Consistent design tokens (colors, spacing, typography)
- Light and dark theme support
- Reusable component styles (buttons, forms, modals, cards)
- Responsive design utilities

### 2. `client/index.html`
A base HTML template that includes:
- Navigation header with app name and help button
- Main layout structure (sidebar + content area)
- Help modal integration
- Proper CSS and JavaScript loading

### 3. `client/help-modal.js`
A dependency-free JavaScript module for the help modal system:
- Consistent modal behavior across all apps
- Keyboard navigation (ESC to close)
- Focus management
- Custom event system

### 4. `client/help-content-template.html`
A template for creating consistent help content:
- Table of contents navigation
- Standardized section structure
- FAQ with collapsible details
- Image integration guidelines

## Usage Instructions

### Setting Up a New Application

1. **Fork the repository**
2. **Customize the HTML template** by replacing placeholders:
   - `<!-- APP_TITLE -->` - Your application title
   - `<!-- APP_NAME -->` - Your application name (appears in header)
   - `<!-- APP_SPECIFIC_HEADER_CONTENT -->` - Any additional header elements
   - `<!-- APP_SPECIFIC_MAIN_CONTENT -->` - Your main content area
   - `<!-- APP_SPECIFIC_CSS -->` - Links to your app-specific CSS files
   - `<!-- APP_SPECIFIC_SCRIPTS -->` - Links to your app-specific JavaScript files

3. **Implement your application logic**. You can use Cursor or other agents for it. There is a file called `AGENTS.md` that contains context LLM can use.
4. **Customise your help content** using the help content template

### Customizing Help Content

Use the `help-content-template.html` as a starting point:

1. **Replace placeholders** like `<!-- APP_NAME -->` with your actual content
2. **Add sections** as needed for your application
3. **Include images** by placing them in a `help/img/` directory
4. **Use the provided structure** for consistency across applications

### CSS Customization

The `bespoke.css` file uses CSS custom properties for easy theming:

```css
.bespoke {
  --bespoke-accent: #1062fb;        /* Primary accent color */
  --bespoke-bg: #ffffff;            /* Background color */
  --bespoke-fg: rgb(24, 33, 57);   /* Text color */
  /* ... many more variables */
}
```

You can override these variables in your app-specific CSS:

```css
.my-app {
  --bespoke-accent: #ff6b6b;  /* Custom accent color */
  --bespoke-bg: #f8f9fa;     /* Custom background */
}
```

### Help Modal API

The `HelpModal` class provides several methods:

```javascript
// Initialize
const modal = HelpModal.init({
  triggerSelector: '#btn-help',
  content: helpContent,
  theme: 'auto'
});

// Update content dynamically
modal.updateContent(newHelpContent);

// Destroy the modal
modal.destroy();
```

## Server

This template includes a local development server (`server.js`) that provides:
- Static file serving for your application
- WebSocket support for real-time messaging
- A REST API for triggering client-side alerts

### Starting the Server

```bash
node server.js
```

The server will start on `http://localhost:3000` by default.

### WebSocket Messaging API

The server provides a `POST /message` endpoint that allows you to send real-time messages to connected clients. This can be used to signal changes in the client during events like "Run" or "Submit". When a message is sent, the preview window with the application open will display an alert with the message.

It uses the `ws` package, so if you want to use it, install the packages (but this is optional).

```
npm install
```

#### Endpoint: `POST /message`

**Request Format:**
```json
{
  "message": "Your message here"
}
```

**Example using curl:**
```bash
curl -X POST http://localhost:3000/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from the server!"}'
```
