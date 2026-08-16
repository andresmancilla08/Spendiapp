import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Fonts } from '../config/fonts';
import type { AppColors } from '../config/colors';

/**
 * El Home en pequeño, para las vistas previas de fondo.
 *
 * Un fondo no se elige mirando el fondo: se elige viendo si TU pantalla se lee
 * encima. La tarjeta enseñaba antes el efecto a pelo y todos parecían bonitos;
 * el que se comía el saldo, apagaba el color del gráfico o ensuciaba las
 * tarjetas solo se descubría al aplicarlo.
 *
 * Es una maqueta simple pero COMPLETA: cabecera, saldo del mes, tendencia,
 * tarjeta de resumen, dos movimientos y barra de pestañas. Todo escala desde el
 * ancho de la tarjeta, así que encoge entera sin romperse. El texto real se
 * limita al importe —la única cifra que hay que poder leer para juzgar— y el
 * resto son bloques: a este tamaño, escribir de verdad sería ruido ilegible.
 *
 * Las superficies van TRANSLÚCIDAS y son pocas a propósito. Con las tarjetas
 * opacas de la app real, la maqueta tapaba justo lo que se está eligiendo y
 * todos los fondos acababan pareciendo el mismo.
 */

interface Props {
  /** Colores del modo que se está previsualizando (claro u oscuro), no los activos. */
  themed: AppColors;
  /** Color de la línea de tendencia — el acento del gráfico del usuario. */
  chartColor: string;
  /** Ancho de la tarjeta: todo escala con esta única medida. */
  width: number;
}

/** Curva fija: la forma importa, los datos no. */
const TREND = 'M0,20 C14,20 20,9 34,9 C48,9 52,15 66,15 C80,15 86,4 100,4';

export default function HomeMiniPreview({ themed, chartColor, width }: Props) {
  // Referencia: 200 px de ancho de tarjeta. Todo se deriva de ahí.
  const u = width / 200;
  const s = (n: number) => Math.round(n * u * 10) / 10;

  const ink = themed.textPrimary;
  /** Barra que sustituye a un texto: a este tamaño, escribir sería ilegible. */
  const bar = (w: number | `${number}%`, h: number, opacity: number, extra?: object) => (
    <View style={[{ width: w as any, height: s(h), borderRadius: s(2), backgroundColor: ink, opacity }, extra]} />
  );

  return (
    <View style={[styles.root, { padding: s(10) }]} pointerEvents="none">
      {/* ── Cabecera: avatar, saludo y campana ── */}
      <View style={[styles.row, { gap: s(6) }]}>
        <View style={{ width: s(20), height: s(20), borderRadius: s(10), backgroundColor: themed.primary, opacity: 0.9 }} />
        <View style={{ gap: s(3), flex: 1 }}>
          {bar('52%', 4, 0.66)}
          {bar('72%', 3, 0.3)}
        </View>
        <View style={{ width: s(9), height: s(9), borderRadius: s(2), backgroundColor: ink, opacity: 0.35 }} />
      </View>

      {/* ── Saldo del mes: la pieza que decide si el fondo deja leer ── */}
      <View style={{ alignItems: 'center', marginTop: s(16) }}>
        <View style={[styles.row, { gap: s(6) }]}>
          {bar(s(4), 4, 0.28)}
          {bar(s(30), 3.5, 0.34)}
          {bar(s(4), 4, 0.28)}
        </View>
        <Text
          style={{
            fontSize: s(21),
            lineHeight: s(27),
            fontFamily: Fonts.extraBold,
            color: themed.primary,
            letterSpacing: -0.6,
            marginTop: s(5),
          }}
          numberOfLines={1}
        >
          $4.286.500
        </Text>
        {/* Chip de variación */}
        <View style={{
          marginTop: s(4),
          paddingHorizontal: s(9),
          paddingVertical: s(3),
          borderRadius: s(9),
          backgroundColor: `${themed.success}2E`,
        }}>
          {bar(s(26), 3.2, 0.5, { backgroundColor: themed.success, opacity: 0.95 })}
        </View>
      </View>

      {/* ── Tendencia: dice si el acento sobrevive sobre el fondo ── */}
      <View style={{ height: s(32), marginTop: s(10) }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 26" preserveAspectRatio="none">
          <Path d={TREND} fill="none" stroke={chartColor} strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </Svg>
      </View>

      {/* ── Tarjeta de resumen ── */}
      <View style={{
        marginTop: s(12),
        padding: s(8),
        borderRadius: s(8),
        gap: s(4),
        backgroundColor: themed.surface,
        opacity: 0.76,
      }}>
        {bar('44%', 3, 0.42, { backgroundColor: themed.primary, opacity: 0.75 })}
        {bar('92%', 3.5, 0.4)}
        {bar('68%', 3.5, 0.4)}
      </View>

      {/* ── Movimientos: lo que el fondo no debe ensuciar ── */}
      <View style={{ gap: s(6), marginTop: s(8) }}>
        {[0.78, 0.72].map((op, i) => (
          <View
            key={i}
            style={[styles.row, {
              gap: s(6),
              padding: s(6),
              borderRadius: s(7),
              backgroundColor: themed.surface,
              opacity: op,
            }]}
          >
            <View style={{ width: s(13), height: s(13), borderRadius: s(4), backgroundColor: themed.primary, opacity: 0.32 }} />
            <View style={{ gap: s(2.5), flex: 1 }}>
              {bar('58%', 3.2, 0.5)}
              {bar('34%', 2.8, 0.26)}
            </View>
            {bar(s(20), 3.5, 0.45, { backgroundColor: themed.expense, opacity: 0.8 })}
          </View>
        ))}
      </View>

      {/* ── Barra de pestañas ── */}
      <View style={[styles.tabBar, {
        paddingVertical: s(6),
        borderRadius: s(13),
        backgroundColor: themed.surface,
        opacity: 0.82,
      }]}>
        {[0.95, 0.3, 0.3].map((op, i) => (
          <View key={i} style={{ width: s(10), height: s(10), borderRadius: s(3), backgroundColor: themed.primary, opacity: op }} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject },
  row: { flexDirection: 'row', alignItems: 'center' },
  tabBar: {
    position: 'absolute',
    left: '14%',
    right: '14%',
    bottom: '4%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
});
