import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />

        <title>Spendia</title>
        <meta name="description" content="Spendia es una app de control de gastos personales para Colombia. Registra tus transacciones, visualiza tus finanzas y toma el control de tu dinero." />
        <meta name="application-name" content="Spendia" />
        <link rel="privacy-policy" href="https://spendia.co/privacy" />
        <link rel="terms-of-service" href="https://spendia.co/terms" />

        {/* Open Graph */}
        <meta property="og:title" content="Spendia — Control inteligente de gastos" />
        <meta property="og:description" content="App de control de gastos personales para Colombia." />
        <meta property="og:url" content="https://spendia.co" />
        <meta property="og:type" content="website" />

        {/* PWA: iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Spendia" />

        {/* Web App Manifest (PWA installability) */}
        <link rel="manifest" href="/manifest.json" />

        {/* Ícono para iOS al agregar a pantalla de inicio */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Capture beforeinstallprompt early before React mounts */}
        <script dangerouslySetInnerHTML={{ __html: `
          window.__pwaPrompt = null;
          window.addEventListener('beforeinstallprompt', function(e) {
            e.preventDefault();
            window.__pwaPrompt = e;
          });
        `}} />

        <ScrollViewStyleReset />

        {/* Remove browser focus outline on all inputs */}
        <style>{`
          * {
            -webkit-tap-highlight-color: transparent;
          }
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
          #spendia-landing {
            transition: opacity 0.35s ease;
          }
          #spendia-landing a:hover {
            text-decoration: underline;
          }
        `}</style>
      </head>
      <body>
        {children}

        {/* Pre-hydration landing — full-screen, visible to crawlers and brand verifiers
            before React mounts. The 'spendiaReady' event (dispatched from _layout.tsx)
            fades this out once the app is ready. Fallback timeout: 6s. */}
        <div id="spendia-landing" style={{
          position: 'fixed' as const,
          inset: 0,
          zIndex: 9999,
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
          background: '#0D1A1C',
          color: '#EEF6F8',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
        }}>
          <img
            src="/apple-touch-icon.png"
            alt="Spendia"
            width={80}
            height={80}
            style={{ borderRadius: 18, marginBottom: 20 }}
          />
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 10px 0', letterSpacing: -0.5, color: '#EEF6F8' }}>
            Spendia
          </h1>
          <p style={{ color: '#00BCD4', fontSize: 16, margin: '0 0 14px 0', textAlign: 'center' as const, fontWeight: 500 }}>
            Control inteligente de gastos personales para Colombia
          </p>
          <p style={{
            color: '#9BAFB5',
            fontSize: 14,
            maxWidth: 420,
            textAlign: 'center' as const,
            lineHeight: '1.65',
            margin: '0 0 40px 0',
          }}>
            Registra ingresos y gastos, categoriza transacciones y visualiza tus finanzas con gráficas claras. Disponible como app web progresiva (PWA).
          </p>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' as const, justifyContent: 'center' as const }}>
            <a href="/privacy" style={{ color: '#00BCD4', fontSize: 13, textDecoration: 'none' }}>
              Política de Privacidad
            </a>
            <a href="/terms" style={{ color: '#00BCD4', fontSize: 13, textDecoration: 'none' }}>
              Términos y Condiciones
            </a>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            var el = document.getElementById('spendia-landing');
            if (!el) return;
            function hide() {
              el.style.opacity = '0';
              el.style.pointerEvents = 'none';
              setTimeout(function() { el.style.visibility = 'hidden'; }, 380);
            }
            window.addEventListener('spendiaReady', hide, { once: true });
            setTimeout(hide, 6000);
          })();
        `}} />

        <noscript>
          <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '60px auto', padding: '0 24px', color: '#1A2428' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Spendia</h1>
            <p style={{ fontSize: '18px', color: '#00BCD4', marginBottom: '24px' }}>Control inteligente de gastos</p>
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
              Spendia es una aplicación de control de gastos personales para Colombia.
              Registra ingresos y gastos, categoriza transacciones y visualiza tus finanzas.
            </p>
            <p>
              <a href="/privacy" style={{ color: '#00BCD4', marginRight: '24px' }}>Política de privacidad</a>
              <a href="/terms" style={{ color: '#00BCD4' }}>Términos y condiciones</a>
            </p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
