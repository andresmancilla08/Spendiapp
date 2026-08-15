import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Mancha de color de borde suave — el ladrillo de casi todos los efectos.
 *
 * POR QUÉ EXISTE
 * Antes un blob era un círculo sólido con `filter: blur(Npx)` encima. Se
 * midieron 13 capas con blur simultáneas cubriendo 2,95 veces la pantalla, y
 * como esas capas también se animaban, la GPU rehacía el desenfoque en cada
 * frame. Un blur gaussiano es multi-paso: animado y a pantalla completa es la
 * operación más cara que se le puede pedir a la GPU de un móvil.
 *
 * Un degradado radial da el mismo borde difuso pintándose una sola vez, y el
 * compositor puede reutilizar la capa mientras solo cambian `transform` y
 * `opacity`. Coste por frame: prácticamente cero.
 *
 * CÓMO SE IMITA EL DESENFOQUE
 * Un degradado de dos paradas produce anillos concéntricos visibles: la
 * transición es lineal y el ojo detecta el corte. Un blur real cae como una
 * campana. Se aproxima con cinco paradas de alfa decreciente, y la última llega
 * a transparente MUY dentro de la caja (≤ 82 %) — si el color siguiera vivo en
 * la esquina, se vería el rectángulo del contenedor.
 */

/** Aplica alfa a un color de la paleta. Acepta `#RGB`, `#RRGGBB` y `#RRGGBBAA`
 *  (en cuyo caso el alfa existente se multiplica por el pedido). */
function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#')) return color;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 8) {
    alpha *= parseInt(hex.slice(6, 8), 16) / 255;
    hex = hex.slice(0, 6);
  }
  if (hex.length !== 6) return color;
  const n = parseInt(hex, 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a.toFixed(3)})`;
}

interface Props {
  color: string;
  /** Segundo color opcional, para blobs con transición de tono. */
  color2?: string;
  /** 0 = borde relativamente definido · 1 = desvanecido casi total.
   *  Sustituye al antiguo desenfoque en píxeles. */
  softness?: number;
  /** Opacidad del propio degradado (la de la animación va en el padre). */
  opacity?: number;
  /** `ellipse` se estira a la caja del padre — para bandas y campos alargados. */
  shape?: 'circle' | 'ellipse';
  style?: any;
}

export default function SoftOrb({ color, color2, softness = 0.5, opacity = 1, shape = 'circle', style }: Props) {
  // Cuanto más suave, antes empieza a caer el color y más gradual es la caída.
  // El último tramo siempre muere dentro de la caja.
  const core = 4 + (1 - softness) * 16;   // 4 % → 20 %
  const edge = 82 - softness * 14;        // 82 % → 68 %
  const at = (k: number) => (core + (edge - core) * k).toFixed(1);
  const c2 = color2 ?? color;

  if (Platform.OS === 'web') {
    // Curva de caída de una campana, muestreada en cinco puntos.
    const stops = [
      `${withAlpha(color, 0.95)} ${at(0)}%`,
      `${withAlpha(c2, 0.62)} ${at(0.3)}%`,
      `${withAlpha(c2, 0.3)} ${at(0.55)}%`,
      `${withAlpha(c2, 0.1)} ${at(0.78)}%`,
      `${withAlpha(c2, 0)} ${edge.toFixed(1)}%`,
    ].join(', ');
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { opacity, backgroundImage: `radial-gradient(${shape} at 50% 50%, ${stops})` } as any,
          style,
        ]}
      />
    );
  }

  // Nativo: dos degradados lineales cruzados aproximan el radial sin blur. El
  // recorte circular lo pone el contenedor (borderRadius), que el efecto ya fija.
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity }, style]}>
      <LinearGradient
        colors={[withAlpha(color, 0.9), withAlpha(c2, 0.35), 'transparent']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['transparent', withAlpha(c2, 0.55), 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
