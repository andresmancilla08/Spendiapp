import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1" />

        <title>Spendia — Control inteligente de gastos</title>
        <meta name="description" content="Spendia es una app de control de gastos personales para Colombia. Registra tus transacciones, visualiza tus finanzas y toma el control de tu dinero." />
        <meta name="application-name" content="Spendia" />

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
        `}</style>
      </head>
      <body>
        {children}
        {/* Always-present landing content — visible to crawlers and before React hydrates.
            The app renders as position:fixed overlay, so this footer is visually behind it
            but always present in the DOM for search engines and brand verifiers. */}
        <div id="spendia-landing" style={{
          position: 'fixed' as const,
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: -1,
          fontFamily: 'sans-serif',
          padding: '16px 24px',
          background: '#0D1A1C',
          color: '#EEF6F8',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column' as const,
          alignItems: 'center',
          gap: '8px',
        }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '18px' }}>Spendia</p>
          <p style={{ margin: 0, color: '#00BCD4' }}>Control inteligente de gastos personales para Colombia</p>
          <p style={{ margin: 0, color: '#9BAFB5', maxWidth: '480px', textAlign: 'center' as const, lineHeight: '1.5' }}>
            Registra ingresos y gastos, categoriza transacciones y visualiza tus finanzas con gráficas claras.
          </p>
          <p style={{ margin: 0, display: 'flex', gap: '24px' }}>
            <a href="/privacy" style={{ color: '#00BCD4' }}>Política de Privacidad</a>
            <a href="/terms" style={{ color: '#00BCD4' }}>Términos y Condiciones</a>
          </p>
        </div>
        <noscript>
          <div style={{ fontFamily: 'sans-serif', maxWidth: '600px', margin: '60px auto', padding: '0 24px', color: '#1A2428' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '8px' }}>Spendia</h1>
            <p style={{ fontSize: '18px', color: '#00BCD4', marginBottom: '24px' }}>Control inteligente de gastos</p>
            <p style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '32px' }}>
              Spendia es una aplicación de control de gastos personales para Colombia.
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
