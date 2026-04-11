# Spendiapp — Reglas de desarrollo

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
