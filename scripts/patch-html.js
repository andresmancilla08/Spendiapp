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

const TITLE = 'Spendia — Control de gastos personales y cuentas compartidas';
const DESCRIPTION =
  'Registra ingresos y gastos, divide cuentas con amigos, controla gastos fijos y cuotas, ' +
  'y visualiza tus finanzas con informes claros. Gratis, desde el móvil o el navegador.';
const ORIGIN = 'https://spendia.co';

// Tags a inyectar justo antes de </head>
const pwaTags = `
  <!-- SEO -->
  <link rel="canonical" href="${ORIGIN}/" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="Spendia" />

  <!-- Open Graph -->
  <meta property="og:site_name" content="Spendia" />
  <meta property="og:title" content="${TITLE}" />
  <meta property="og:description" content="${DESCRIPTION}" />
  <meta property="og:url" content="${ORIGIN}/" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="es_CO" />
  <meta property="og:locale:alternate" content="en_US" />
  <meta property="og:locale:alternate" content="it_IT" />
  <meta property="og:image" content="${ORIGIN}/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Spendia — controla tus gastos y haz crecer tu dinero" />

  <!-- Twitter / X -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${TITLE}" />
  <meta name="twitter:description" content="${DESCRIPTION}" />
  <meta name="twitter:image" content="${ORIGIN}/og-image.png" />

  <!-- Datos estructurados: la ficha de la app en resultados de búsqueda -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Spendia",
    "url": "${ORIGIN}/",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "Web, iOS, Android",
    "description": "${DESCRIPTION}",
    "inLanguage": ["es", "en", "it"],
    "image": "${ORIGIN}/og-image.png",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "COP" },
    "publisher": { "@type": "Organization", "name": "Spendia", "url": "${ORIGIN}/", "logo": "${ORIGIN}/icon-512.png" }
  }
  </script>

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

  <!-- Chrome del sistema (barra de estado / barra de navegacion) ANTES de que React
       monte. Sin esto el color solo se fijaba al montar AppBackground, y la PWA
       instalada ya habia pintado la franja con el valor estatico del manifest o con
       su blanco por defecto (barra blanca en modo oscuro). '@spendia_chrome' lo
       cachea AppBackground con el color real de la paleta activa; el neutro por
       modo ('@spendiapp_theme') es el fallback del primer arranque. -->
  <script>
    (function () {
      try {
        var mode = window.localStorage.getItem('@spendiapp_theme');
        var dark = mode === 'dark' || (mode !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        var chrome = window.localStorage.getItem('@spendia_chrome') || (dark ? '#000000' : '#FFFFFF');
        document.documentElement.style.setProperty('--spendia-app-bg', chrome);
        var m = document.querySelector('meta[name="theme-color"]');
        if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
        m.setAttribute('content', chrome);
      } catch (e) {}
    })();
  </script>

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
      height: 100lvh;
      background: var(--spendia-app-bg, #000000);
      overscroll-behavior: none;
    }
    /* El root SIEMPRE cubre la pantalla FÍSICA. Medido en la PWA instalada
       (iPhone 17, iOS 26.5): innerHeight = 820, 100dvh = 100svh = 812, y
       100vh = 100lvh = screen.height = 874 con safe areas de 62 arriba y 34
       abajo. Es decir 'inset: 0' (= 820) y 'dvh' se quedan CORTOS y dejaban
       asomar el canvas del navegador en la franja del home indicator. 'lvh'
       (viewport largo, ignora las barras retráctiles) es la única medida que
       llega al borde; 'vh' es el fallback para navegadores sin 'lvh'. */
    #root {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 100vh;
      height: 100lvh;
    }
    /* Zona segura superior: SIN banda. Con black-translucent la webview ya se
       extiende bajo la barra de estado, asi que el gradiente y el efecto animado
       de AppBackground la pintan igual que el resto de la pantalla. */
  </style>
`;

// Reemplazar el viewport generado por Expo (shrink-to-fit=no) por el correcto
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />'
);

// Título y descripción con intención de búsqueda — Expo escribe los de app.json,
// pensados para la ficha de la app, no para resultados de búsqueda.
html = html.replace(/<title>[^<]*<\/title>/, `<title>${TITLE}</title>`);
html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${DESCRIPTION}">`);

// Inyectar tags antes de </head> (solo si aún no están)
if (!html.includes('rel="manifest"')) {
  html = html.replace('</head>', pwaTags + '</head>');
}

// El <noscript> de Expo ("You need to enable JavaScript") es lo único que ven los
// bots que no ejecutan JS. Se sustituye por la descripción real del producto:
// no afecta a ningún usuario con JS y da contenido indexable a esos rastreadores.
html = html.replace(
  /<noscript>[\s\S]*?<\/noscript>/,
  `<noscript>
      <main style="font-family:system-ui,-apple-system,sans-serif;max-width:640px;margin:56px auto;padding:0 24px;color:#1A2428">
        <h1 style="font-size:32px;margin:0 0 8px">Spendia</h1>
        <p style="font-size:18px;color:#00838F;margin:0 0 24px">${TITLE}</p>
        <p style="font-size:16px;line-height:1.65;margin:0 0 20px">${DESCRIPTION}</p>
        <h2 style="font-size:20px;margin:0 0 8px">Qué puedes hacer con Spendia</h2>
        <ul style="font-size:16px;line-height:1.8;margin:0 0 24px;padding-left:20px">
          <li>Registrar ingresos y gastos y categorizarlos en segundos.</li>
          <li>Dividir gastos compartidos con amigos y liquidar cuentas.</li>
          <li>Controlar gastos fijos, cuotas y tarjetas.</li>
          <li>Ver informes mensuales y anuales con gráficas claras.</li>
          <li>Instalarla como app (PWA) en iOS y Android, sin tiendas.</li>
        </ul>
        <p style="font-size:15px">
          <a href="/privacy" style="color:#00838F;margin-right:20px">Política de privacidad</a>
          <a href="/terms" style="color:#00838F">Términos y condiciones</a>
        </p>
        <p style="font-size:15px;color:#5A6B70;margin-top:24px">Activa JavaScript para usar la aplicación.</p>
      </main>
    </noscript>`
);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('[patch-html] dist/index.html patched successfully.');
