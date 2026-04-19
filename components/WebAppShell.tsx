import React from 'react';

// Wrapper neutral — no restringe el ancho. El responsive se maneja
// por cada capa (ScreenBackground, AppTabBar) con useBreakpoint.
export default function WebAppShell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
