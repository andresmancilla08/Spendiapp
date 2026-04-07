#!/usr/bin/env node
/**
 * Post-build: inyecta PWA tags en dist/index.html que Expo Metro no incluye
 * desde +html.tsx en exports estáticos.
 */
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'dist', 'index.html');

if (!fs.existsSync(htmlPath)) {
  console.error('[patch-html] dist/index.html not found. Run expo export first.');
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, 'utf8');

// Tags a inyectar justo antes de </head>
const pwaTags = `
  <!-- PWA Manifest -->
  <link rel="manifest" href="/manifest.json" />

  <!-- iOS PWA -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="default" />
  <meta name="apple-mobile-web-app-title" content="Spendia" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

  <!-- Captura beforeinstallprompt antes de que React monte (Android PWA install) -->
  <script>
    window.__pwaPrompt = null;
    window.addEventListener('beforeinstallprompt', function(e) {
      e.preventDefault();
      window.__pwaPrompt = e;
    });
  </script>

  <!-- Quitar outline en inputs / focus rings -->
  <style>
    * { -webkit-tap-highlight-color: transparent; }
    input, textarea, select, [contenteditable] {
      outline: none !important;
      box-shadow: none !important;
      -webkit-appearance: none;
    }
    input:focus, textarea:focus, select:focus, [contenteditable]:focus,
    input:focus-visible, textarea:focus-visible, select:focus-visible, [contenteditable]:focus-visible {
      outline: none !important;
      box-shadow: none !important;
    }
  </style>
`;

// Reemplazar el viewport generado por Expo (shrink-to-fit=no) por el correcto
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />'
);

// Inyectar tags antes de </head> (solo si aún no están)
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', pwaTags + '</head>');
}

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[patch-html] dist/index.html patched successfully.');
