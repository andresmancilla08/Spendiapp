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

## Animación — Reglas obligatorias

Estas tres reglas salieron de una auditoría medida: el patrón anterior hacía
**1.440 escrituras del atributo `style` por segundo con la app en reposo** y
mantenía **13 capas desenfocadas** cubriendo casi tres pantallas. Era la causa
de que la app calentara el teléfono.

**1. El movimiento decorativo NUNCA se anima desde JS.**
Todo efecto de fondo y toda animación en bucle pasa por `components/fx/FxLayer.tsx`.

```tsx
import FxLayer, { type FxFrame } from './fx/FxLayer';

const FRAMES: FxFrame[] = [
  { at: 0,   opacity: 0.2, x: 0,  y: 0 },
  { at: 0.5, opacity: 0.5, x: 24, y: -20 },
  { at: 1,   opacity: 0.2, x: 0,  y: 0 },
];

<FxLayer frames={FRAMES} duration={9000} phase={0.33} easing="sin" style={...} />
```

Prohibido `Animated.loop` con `useNativeDriver: false` para decoración. En web
ese driver no existe: si pides `true` sin `Platform.OS !== 'web'`, solo obtienes
un aviso en consola y cae a JS igual.

**2. El borde difuso se pinta, no se desenfoca.**
Nada de `filter: blur()` sobre capas que se animan — la GPU rehace el desenfoque
en cada frame. Usar `components/fx/SoftOrb.tsx` (degradado radial). El ajuste de
Personalización es `BACKGROUND_SOFTNESS`, no píxeles de blur.

**3. El valor de una animación nunca pasa por el estado de React.**
Prohibido `animatedValue.addListener(({ value }) => setState(value))`: eso
re-renderiza el componente entero en cada frame. Los valores viajan por
`Animated` hasta la propiedad, o por keyframes. Para atributos SVG,
`Animated.createAnimatedComponent(Path)`. Única excepción: un contador numérico
que se muestra como texto, y siempre transitorio, nunca en bucle.

**Además:** todo `useEffect` que arranque una animación debe devolver su
limpieza. `Skeleton` y `ExchangeRateChips` no lo hacían y dejaban bucles vivos
tras desmontarse.

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
