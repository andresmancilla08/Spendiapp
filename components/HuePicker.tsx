import { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { Fonts } from '../config/fonts';
import { hsl } from '../utils/derivePalette';

/**
 * Selector de matiz: una franja con todo el círculo cromático y un tirador.
 *
 * Es una franja y no una rueda a propósito. Una rueda pide precisión de dos
 * ejes con el dedo sobre una superficie pequeña; aquí solo se elige UNA cosa
 * —el matiz—, porque la saturación y la luminosidad las decide el acabado
 * (vivo/suave) y las calcula el generador. Un eje, un gesto, cero frustración.
 *
 * Debajo, doce muestras fijas: la mayoría de la gente no busca "el matiz 187",
 * busca "un azul". Las muestras resuelven eso de un toque y la franja queda
 * para quien quiera afinar.
 */

interface Props {
  hue: number;
  onChange: (hue: number) => void;
}

const TRACK_HEIGHT = 44;
/** Suficientes paradas para que el degradado no muestre bandas. */
const RAINBOW = Array.from({ length: 13 }, (_, i) => hsl(i * 30, 75, 50)) as unknown as readonly [string, string, ...string[]];
/** Muestras rápidas, una por hora del círculo. */
const SWATCHES = Array.from({ length: 12 }, (_, i) => i * 30);

export default function HuePicker({ hue, onChange }: Props) {
  const { colors } = useTheme();

  // El ancho real llega por `onLayout`; se guarda en una ref mutable dentro del
  // responder para no re-crearlo en cada render.
  const state = useMemo(() => ({ width: 0 }), []);

  const setFromX = (x: number) => {
    if (!state.width) return;
    const pct = Math.max(0, Math.min(1, x / state.width));
    onChange(Math.round(pct * 359));
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => setFromX(e.nativeEvent.locationX),
        onPanResponderMove: (e) => setFromX(e.nativeEvent.locationX),
      }),
    // `state` es estable; `onChange` se lee siempre fresco por cierre de módulo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state],
  );

  const thumbPct = (hue / 359) * 100;

  return (
    <View style={styles.root}>
      <View
        style={[styles.track, { borderColor: colors.border }]}
        onLayout={(e) => { state.width = e.nativeEvent.layout.width; }}
        {...responder.panHandlers}
      >
        <LinearGradient
          colors={RAINBOW}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFillObject}
        />
        {/* El tirador lleva dentro el color elegido: se ve lo que se está
            eligiendo sin tener que mirar la vista previa. */}
        <View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              left: `${thumbPct}%`,
              backgroundColor: hsl(hue, 75, 50),
              borderColor: '#FFFFFF',
            },
            Platform.OS === 'web'
              ? ({ boxShadow: '0 1px 6px rgba(0,0,0,0.35)' } as any)
              : { shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 1 } },
          ]}
        />
      </View>

      <View style={styles.swatches}>
        {SWATCHES.map((h) => {
          // Un matiz "coincide" con la muestra si está a menos de media parada.
          const active = Math.abs(((hue - h + 180 + 360) % 360) - 180) < 15;
          return (
            <TouchableOpacity
              key={h}
              onPress={() => onChange(h)}
              accessibilityRole="button"
              accessibilityLabel={`${h}°`}
              accessibilityState={{ selected: active }}
              style={[
                styles.swatch,
                {
                  backgroundColor: hsl(h, 72, 52),
                  borderColor: active ? colors.textPrimary : 'transparent',
                  borderWidth: active ? 2.5 : 0,
                },
              ]}
            />
          );
        })}
      </View>

      <Text style={[styles.readout, { color: colors.textTertiary }]}>{hsl(hue, 70, 48)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 12 },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'visible',
    borderWidth: 1,
    justifyContent: 'center',
  },
  thumb: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    marginLeft: -14,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  readout: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
