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
 * En nativo no hay degradado radial, así que se aproxima con dos capas lineales
 * cruzadas — el resultado a estas opacidades es indistinguible, y sigue sin
 * costar un solo blur.
 */

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
  // Cuanto más suave, antes empieza a desvanecer y más lejos llega la cola.
  const core = Math.round(6 + (1 - softness) * 26);      // 6 % → 32 %
  const mid = Math.round(core + 18 + softness * 16);     // parada intermedia
  const edge = Math.round(Math.min(96, mid + 22 + softness * 20));

  if (Platform.OS === 'web') {
    const stops = color2
      ? `${color} ${core}%, ${color2} ${mid}%, transparent ${edge}%`
      : `${color} ${core}%, transparent ${edge}%`;
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

  // Nativo: dos degradados lineales cruzados aproximan el radial sin blur.
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { opacity }, style]}>
      <LinearGradient
        colors={[color, color2 ?? color, 'transparent']}
        locations={[0, Math.min(0.85, mid / 100), 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <LinearGradient
        colors={['transparent', color2 ?? color, 'transparent']}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[StyleSheet.absoluteFillObject, { opacity: 0.75 }]}
      />
    </View>
  );
}
