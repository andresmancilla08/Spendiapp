# Spendiapp — Reglas de desarrollo

## Deploy — Flujo obligatorio

**ANTES de cualquier `npm run deploy`**, siempre en este orden:

1. Bump `package.json` → misma versión a desplegar
2. Bump `app.json` (`expo.version`) → **mismo valor** que `package.json`
3. `git commit` con ambos archivos
4. `npm run deploy`

**Por qué:** `WhatsNew.tsx` lee `WHATS_NEW_VERSION` de `app.json` (`appConfig.expo.version`).
Si solo se bumpa `package.json`, la versión del modal no cambia → el usuario nunca ve las novedades.

Verificación rápida antes de deploy:
```bash
node -p "require('./package.json').version"
node -p "require('./app.json').expo.version"
# Deben ser idénticos
```

## Transición de pantallas

**Toda vista nueva debe usar `ScreenTransition` como wrapper raíz del JSX retornado.**

`ScreenTransition` está en `components/ScreenTransition.tsx` y aplica una animación
fade + slide-up suave (entrada: 300ms ease-out cubic, salida: 220ms ease-in cubic).

### Patrón obligatorio para cada nueva vista:

```tsx
import ScreenTransition from '../components/ScreenTransition'; // ajustar path según profundidad

export default function MiVista() {
  return (
    <ScreenTransition>
      <SafeAreaView ...>
        {/* contenido */}
      </SafeAreaView>
    </ScreenTransition>
  );
}
```

**Para vistas con Fragment raíz** (ej. `InputAccessoryView` en iOS), envolver solo el `SafeAreaView`:

```tsx
return (
  <>
    {Platform.OS === 'ios' && <InputAccessoryView ... />}
    <ScreenTransition>
      <SafeAreaView ...>
        {/* contenido */}
      </SafeAreaView>
    </ScreenTransition>
  </>
);
```

**Para navegación con animación de salida personalizada**, usar el ref:

```tsx
import ScreenTransition, { ScreenTransitionRef } from '../components/ScreenTransition';

const transitionRef = useRef<ScreenTransitionRef>(null);

const handleBack = () => {
  transitionRef.current?.animateOut(() => router.back());
};

return (
  <ScreenTransition ref={transitionRef}>
    ...
  </ScreenTransition>
);
```

### Aplica a:
- Pantallas en `app/(tabs)/`
- Pantallas en `app/(auth)/`
- Pantallas en `app/(onboarding)/`
- Pantallas raíz en `app/`
- Cualquier nueva pantalla futura

## Documentación de contexto

Contexto del proyecto en `docs/contexto/` (leer antes de planificar cambios):
- [Arquitectura](docs/contexto/arquitectura.md) · [Convenciones](docs/contexto/convenciones.md) · [Decisiones](docs/contexto/decisiones.md)
- [Glosario y Entidades](docs/contexto/glosario.md) · [Flujo de Trabajo](docs/contexto/flujo-de-trabajo.md) · [Errores Conocidos](docs/contexto/errores-conocidos.md)
