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

  <!-- iOS PWA. black-translucent = la webview se extiende bajo la barra de estado
       (iOS ignora theme-color en apps instaladas), así la zona segura la pinta el
       fondo real de la app con la paleta del usuario, sin banda de marca. -->
  <meta name="apple-mobile-web-app-capable" content="yes" />
  <meta name="mobile-web-app-capable" content="yes" />
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
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

  <!-- Service Worker registration (required for Android PWA install prompt) -->
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js');
      });
    }
  </script>

  <!-- Quitar outline y tap highlight en todos los elementos interactivos (PWA mobile) -->
  <style>
    *, *:focus, *:focus-visible, *:focus-within {
      outline: none !important;
      box-shadow: none !important;
      -webkit-tap-highlight-color: transparent !important;
    }
    input, textarea, select, [contenteditable] {
      -webkit-appearance: none;
    }
    /* Alto REAL del viewport en PWA instalada. El reset de Expo deja
       html/body/#root en height:100%, que en iOS standalone resuelve al viewport
       SIN safe areas → sobraba el inset superior (~47pt) o el del home indicator
       (~34pt) y se veía el canvas blanco del navegador. 100dvh sigue el viewport
       dinámico; las declaraciones previas son el fallback. El canvas se pinta con
       el fondo real de la app (--spendia-app-bg, lo escribe AppBackground). */
    html, body {
      height: 100%;
      height: -webkit-fill-available;
      height: 100dvh;
      background: var(--spendia-app-bg, #0D1A1C);
      overscroll-behavior: none;
    }
    /* El root SIEMPRE cubre el viewport real. En PWA iOS standalone 100dvh/100vh
       se quedan cortos (excluyen el inset del home indicator en algunos modelos)
       y sobraba una franja del canvas bajo la tab bar. fixed + inset:0 con
       viewport-fit=cover no depende de esa medida. */
    #root {
      position: fixed;
      inset: 0;
      height: auto;
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
