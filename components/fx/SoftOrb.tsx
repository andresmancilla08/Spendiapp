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
 * El blob original era un DISCO de color uniforme cuyo borde suavizaba un blur
 * pequeño, no un halo que se apaga desde el centro. Un degradado que empieza a
 * caer en el centro se lee como un anillo y cambia el efecto por completo. Así
 * que el color se mantiene pleno hasta `flat` y solo entonces cae, con varias
 * paradas de alfa para que la transición no marque un borde.
 *
 * El degradado se ancla con `closest-side`: el 100 % cae en el borde de la
 * figura inscrita en la caja, no en su esquina. Sin eso el color seguía vivo en
 * las cuatro esquinas y el blob se leía como un cuadrado.
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
  // `flat`: hasta dónde el color se mantiene pleno. Cuanto más suave, antes
  // empieza a caer. `edge`: dónde llega a transparente.
  const edge = 100;
  // Núcleo pequeño y caída larga: es lo que distingue una mancha desenfocada de
  // un disco con el borde degradado. Con la meseta alta el círculo se recorta
  // demasiado limpio y el fondo deja de leerse como niebla de color.
  const flat = Math.max(2, 64 * (1 - softness));
  const at = (k: number) => (flat + (edge - flat) * k).toFixed(1);
  const c2 = color2 ?? color;

  if (Platform.OS === 'web') {
    // Meseta corta y después una caída de varias paradas: con solo dos el ojo
    // detecta el corte y aparece un anillo.
    //
    // PEAK: un blur gaussiano no solo difumina el borde, también REPARTE la luz
    // y baja el pico del centro. Un degradado no lo hace solo, y sin esta
    // compensación el núcleo quedaba tan brillante en modo oscuro que el texto
    // encima perdía contraste — justo lo que el fondo nunca debe hacer.
    const PEAK = 0.74;
    const stops = [
      `${withAlpha(color, PEAK)} 0%`,
      `${withAlpha(color, 0.92 * PEAK)} ${flat.toFixed(1)}%`,
      `${withAlpha(c2, 0.55 * PEAK)} ${at(0.3)}%`,
      `${withAlpha(c2, 0.24 * PEAK)} ${at(0.56)}%`,
      `${withAlpha(c2, 0.07 * PEAK)} ${at(0.8)}%`,
      `${withAlpha(c2, 0)} ${edge.toFixed(1)}%`,
    ].join(', ');
    return (
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { opacity, backgroundImage: `radial-gradient(${shape} closest-side at 50% 50%, ${stops})` } as any,
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
