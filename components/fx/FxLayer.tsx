import React, { useMemo, useRef, useEffect } from 'react';
import { View, Animated, Easing, Platform, type ViewStyle } from 'react-native';
import { useIsActive } from '../../hooks/useIsActive';


/**
 * Capa para el movimiento decorativo que SÍ queda en la app: el pulso del
 * skeleton, el punto de "en vivo" y el trazo del gráfico. Los efectos de fondo
 * ya no la usan — están quietos (ver `hooks/useFrozenPhase.ts`).
 *
 * POR QUÉ EXISTE
 * Un `Animated.loop` con `useNativeDriver: false` interpola en JS y escribe
 * estilos inline en el DOM en CADA frame: se midieron 1.440 escrituras de
 * `style` por segundo con la app en reposo. Era la causa de que la app
 * calentara el teléfono.
 *
 * QUÉ HACE
 * - Web: emite una animación CSS (`animationKeyframes` de react-native-web). La
 *   ejecuta el compositor del navegador, fuera del hilo de JS. Coste por frame
 *   en JS: cero.
 * - Nativo: `Animated` con `useNativeDriver: true`, que corre en el hilo de UI
 *   sin cruzar el puente. Obliga a limitarse a `opacity` y `transform`.
 *
 * Además se pausa sola cuando la app no está visible (ver `useIsActive`).
 */

export interface FxFrame {
  /** Posición en el ciclo, 0 → 1. */
  at: number;
  opacity?: number;
  /** translateX en px. */
  x?: number;
  /** translateY en px. */
  y?: number;
  scale?: number;
}

export type FxEasing = 'linear' | 'sin' | 'out';

interface Props {
  frames: FxFrame[];
  /** Duración de un ciclo completo, en ms. */
  duration: number;
  /** Desfase inicial dentro del ciclo, 0 → 1. Evita que todos los elementos de
   *  un mismo efecto arranquen sincronizados. */
  phase?: number;
  /** Espera antes del primer ciclo, en ms. Alternativa a `phase` para efectos
   *  que entran escalonados (partículas, bokeh). */
  delay?: number;
  easing?: FxEasing;
  /** Una sola pasada en vez de bucle: para entradas que ocurren al abrir y no
   *  se repiten. Sin esto, un "destello" volvería a cruzar cada pocos segundos. */
  once?: boolean;
  /** Rotación fija; se aplica después de las transformaciones animadas. */
  rotate?: string;
  style?: ViewStyle | (ViewStyle | false | null | undefined)[];
  children?: React.ReactNode;
  pointerEvents?: 'none' | 'auto';
}

const CSS_EASING: Record<FxEasing, string> = {
  linear: 'linear',
  sin: 'ease-in-out',
  out: 'cubic-bezier(0.33, 1, 0.68, 1)',
};

const NATIVE_EASING: Record<FxEasing, (v: number) => number> = {
  linear: Easing.linear,
  sin: Easing.inOut(Easing.sin),
  out: Easing.out(Easing.quad),
};

/** Transform en formato RN a partir de un fotograma. */
function frameTransform(f: FxFrame, rotate?: string) {
  const t: any[] = [];
  if (f.x !== undefined) t.push({ translateX: f.x });
  if (f.y !== undefined) t.push({ translateY: f.y });
  if (f.scale !== undefined) t.push({ scale: f.scale });
  if (rotate) t.push({ rotate });
  return t;
}

export default function FxLayer({
  frames, duration, phase = 0, delay = 0, easing = 'linear', once = false,
  rotate, style, children, pointerEvents = 'none',
}: Props) {
  const active = useIsActive();

  // ── Web: animación CSS, cero JS por frame ──
  // El desfase se consigue con `animationDelay` NEGATIVO: la animación arranca
  // ya avanzada, sin necesidad de un primer tramo distinto.
  const webStyle = useMemo(() => {
    if (Platform.OS !== 'web') return null;
    const keyframes: Record<string, any> = {};
    for (const f of frames) {
      const key = `${Math.round(f.at * 10000) / 100}%`;
      const k: any = {};
      if (f.opacity !== undefined) k.opacity = f.opacity;
      const t = frameTransform(f, rotate);
      if (t.length) k.transform = t;
      keyframes[key] = k;
    }
    return {
      animationKeyframes: [keyframes],
      animationDuration: `${duration}ms`,
      animationDelay: `${delay - phase * duration}ms`,
      animationTimingFunction: CSS_EASING[easing],
      animationIterationCount: once ? 1 : 'infinite',
      animationPlayState: active ? 'running' : 'paused',
      // Sin esto el elemento salta a su estilo base durante el `delay`.
      animationFillMode: 'both',
    } as any;
  }, [frames, duration, phase, delay, easing, rotate, active, once]);

  // ── Nativo: Animated en el hilo de UI ──
  const v = useRef(new Animated.Value(phase)).current;
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!active) { v.stopAnimation(); return; }

    let loop: Animated.CompositeAnimation | null = null;
    const ease = NATIVE_EASING[easing];
    const full = () => Animated.timing(v, {
      toValue: 1, duration, easing: ease, useNativeDriver: true,
    });

    // Primer tramo desde la fase actual, después el ciclo completo.
    const start = () => {
      const from = (v as any)._value ?? phase;
      const head = Animated.timing(v, {
        toValue: 1,
        duration: Math.max(1, duration * (1 - from)),
        easing: ease,
        useNativeDriver: true,
      });
      head.start(({ finished }) => {
        if (!finished || once) return;
        v.setValue(0);
        loop = Animated.loop(full());
        loop.start();
      });
      return head;
    };

    const kickoff = delay > 0 ? setTimeout(start, delay) : null;
    const head = delay > 0 ? null : start();
    return () => {
      if (kickoff) clearTimeout(kickoff);
      head?.stop();
      loop?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, delay, easing, active, once]);

  const nativeStyle = useMemo(() => {
    if (Platform.OS === 'web') return null;
    const sorted = [...frames].sort((a, b) => a.at - b.at);
    const input = sorted.map((f) => f.at);
    const out: any = {};

    const channel = (pick: (f: FxFrame) => number | undefined) => {
      if (sorted.every((f) => pick(f) === undefined)) return null;
      // Los fotogramas que no declaran el canal heredan el último valor visto.
      let last = pick(sorted[0]) ?? 0;
      const values = sorted.map((f) => { const x = pick(f); if (x !== undefined) last = x; return last; });
      return v.interpolate({ inputRange: input, outputRange: values });
    };

    const opacity = channel((f) => f.opacity);
    if (opacity) out.opacity = opacity;

    const t: any[] = [];
    const tx = channel((f) => f.x);
    const ty = channel((f) => f.y);
    const sc = channel((f) => f.scale);
    if (tx) t.push({ translateX: tx });
    if (ty) t.push({ translateY: ty });
    if (sc) t.push({ scale: sc });
    if (rotate) t.push({ rotate });
    if (t.length) out.transform = t;
    return out;
  }, [frames, rotate, v]);

  const styles = Array.isArray(style) ? style : [style];

  if (Platform.OS === 'web') {
    return <View pointerEvents={pointerEvents} style={[...styles, webStyle] as any}>{children}</View>;
  }
  return <Animated.View pointerEvents={pointerEvents} style={[...styles, nativeStyle] as any}>{children}</Animated.View>;
}
