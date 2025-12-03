const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const DIST_CLIENT_DIR = path.join(DIST_DIR, 'client');

// Ensure dist directories exist
function ensureDirs() {
  [DIST_DIR, DIST_CLIENT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// JavaScript files in load order (from index.html)
const jsFiles = [
  'client/help-modal.js',
  'client/logger.js',
  'client/core/status.js',
  'client/core/config.js',
  'client/core/operation-schemas.js',
  'client/core/help.js',
  'client/core/mode-manager.js',
  'client/core/color-utils.js',
  'client/core/theme-service.js',
  'client/core/results-panel.js',
  'client/core/format-utils.js',
  'client/core/vector.js',
  'client/core/animator.js',
  'client/core/coordinate-system.js',
  'client/app.js',
  'client/entities/matrix.js',
  'client/modes/vector-sidebar.js',
  'client/modes/vector-canvas.js',
  'client/modes/vector-operations.js',
  'client/modes/vector-mode.js',
  'client/modes/matrix-operations.js',
  'client/modes/matrix-mode.js',
  'client/modes/tensor-canvas-3d.js',
  'client/modes/tensor-mode.js',
  'client/linear-algebra.js'
];

// CSS files (Design System foundations and components first, then app-specific)
const cssFiles = [
  // Design System Foundations
  'client/design-system/colors/colors.css',
  'client/design-system/spacing/spacing.css',
  'client/design-system/typography/typography.css',
  // Design System Components
  'client/design-system/components/button/button.css',
  'client/design-system/components/boxes/boxes.css',
  'client/design-system/components/input/input.css',
  'client/design-system/components/dropdown/dropdown.css',
  'client/design-system/components/numeric-slider/numeric-slider.css',
  // App-specific CSS
  'client/bespoke.css',
  'client/layout.css',
  'client/vector-mode.css',
  'client/matrix-mode.css',
  'client/tensor-mode.css'
];

// Minify content using esbuild transform API (no temp files needed)
async function minify(content, loader = 'js') {
  const result = await esbuild.transform(content, {
    loader,
    minify: true,
    target: 'es2020',
  });
  return result.code;
}

// Bundle and minify files
async function bundleFiles(files, outputPath, loader = 'js') {
  const content = files
    .map(file => fs.readFileSync(path.join(__dirname, file), 'utf8'))
    .join('\n\n');

  const minified = await minify(content, loader);
  fs.writeFileSync(outputPath, minified);
}

// Bundle Design System JavaScript modules and expose to window
async function bundleDesignSystemModules() {
  // Use relative paths since absWorkingDir is set to client/
  const tempEntryContent = `import Dropdown from './design-system/components/dropdown/dropdown.js';
import NumericSlider from './design-system/components/numeric-slider/numeric-slider.js';
window.Dropdown = Dropdown;
window.NumericSlider = NumericSlider;
`;

  const tempEntryPath = path.join(__dirname, 'client', '.temp-design-system-entry.js');
  fs.writeFileSync(tempEntryPath, tempEntryContent);

  try {
    const result = await esbuild.build({
      entryPoints: ['.temp-design-system-entry.js'], // Relative to absWorkingDir
      bundle: true,
      format: 'iife',
      outfile: path.join(DIST_CLIENT_DIR, 'design-system.bundle.js'),
      minify: true,
      target: 'es2020',
      absWorkingDir: path.join(__dirname, 'client'),
      write: false, // Don't write, we'll handle it manually
    });

    // Get the bundled code - esbuild handles window exposure via the entry file
    const bundled = result.outputFiles[0].text;
    fs.writeFileSync(path.join(DIST_CLIENT_DIR, 'design-system.bundle.js'), bundled);
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempEntryPath)) {
      fs.unlinkSync(tempEntryPath);
    }
  }
}

// Copy directory recursively (simplified)
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  return true;
}

// Create production HTML
function createProductionHtml() {
  let html = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');

  // Remove all script tags
  html = html.replace(/<script[^>]*src="[^"]+"[^>]*><\/script>\s*/g, '');

  // Remove all CSS link tags
  html = html.replace(/<link rel="stylesheet" href="[^"]+\.css"[^>]*>\s*/g, '');

  // Insert bundled CSS before </head>
  html = html.replace('</head>', '  <link rel="stylesheet" href="./styles.bundle.css" />\n</head>');

  // Insert bundled scripts before </body> (design-system bundle first, then app bundle)
  html = html.replace('</body>', '  <script src="./design-system.bundle.js"></script>\n  <script src="./app.bundle.js"></script>\n</body>');

  fs.writeFileSync(path.join(DIST_CLIENT_DIR, 'index.html'), html);
}

async function build() {
  console.log('Building production bundle...');

  try {
    ensureDirs();

    // Bundle Design System JavaScript modules
    console.log('Bundling Design System modules...');
    await bundleDesignSystemModules();
    console.log('✓ Design System modules bundled');

    // Bundle JavaScript
    console.log('Bundling JavaScript files...');
    await bundleFiles(jsFiles, path.join(DIST_CLIENT_DIR, 'app.bundle.js'), 'js');
    console.log('✓ JavaScript bundled');

    // Bundle CSS
    console.log('Bundling CSS files...');
    let cssContent = cssFiles
      .map(file => fs.readFileSync(path.join(__dirname, file), 'utf8'))
      .join('\n\n');

    // Fix font paths: change /design-system/fonts/ to ./design-system/fonts/
    cssContent = cssContent.replace(/\/design-system\/fonts\//g, './design-system/fonts/');

    const minifiedCss = await minify(cssContent, 'css');
    fs.writeFileSync(path.join(DIST_CLIENT_DIR, 'styles.bundle.css'), minifiedCss);
    console.log('✓ CSS bundled');

    // Minify server.js
    console.log('Minifying server.js...');
    const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
    const minifiedServer = await minify(serverContent, 'js');
    fs.writeFileSync(path.join(DIST_DIR, 'server.js'), minifiedServer);
    console.log('✓ server.js minified');

    // Copy static files
    console.log('Copying static files...');
    fs.writeFileSync(
      path.join(DIST_DIR, 'package.json'),
      fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8')
    );
    fs.writeFileSync(
      path.join(DIST_CLIENT_DIR, 'config.json'),
      fs.readFileSync(path.join(__dirname, 'client', 'config.json'), 'utf8')
    );
    fs.writeFileSync(
      path.join(DIST_CLIENT_DIR, 'help-content-vector.html'),
      fs.readFileSync(path.join(__dirname, 'client', 'help-content-vector.html'), 'utf8')
    );
    fs.writeFileSync(
      path.join(DIST_CLIENT_DIR, 'help-content-matrix.html'),
      fs.readFileSync(path.join(__dirname, 'client', 'help-content-matrix.html'), 'utf8')
    );
    fs.writeFileSync(
      path.join(DIST_CLIENT_DIR, 'help-content-tensor.html'),
      fs.readFileSync(path.join(__dirname, 'client', 'help-content-tensor.html'), 'utf8')
    );
    console.log('✓ Static files copied');

    // Copy Design System fonts
    console.log('Copying Design System fonts...');
    const fontsSrc = path.join(__dirname, 'client', 'design-system', 'fonts');
    const fontsDest = path.join(DIST_CLIENT_DIR, 'design-system', 'fonts');
    const fontsCopied = copyDir(fontsSrc, fontsDest);
    console.log(fontsCopied ? '✓ Design System fonts copied' : '⚠ Design System fonts not found, skipping...');

    // Copy ws dependency
    console.log('Copying ws dependency...');
    const wsCopied = copyDir(
      path.join(__dirname, 'node_modules', 'ws'),
      path.join(DIST_DIR, 'node_modules', 'ws')
    );
    console.log(wsCopied ? '✓ ws dependency copied' : '⚠ ws dependency not found, skipping...');

    // Create production HTML
    console.log('Creating production index.html...');
    createProductionHtml();
    console.log('✓ Production index.html created');

    console.log('\n✓ Build complete! Output in dist/');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
