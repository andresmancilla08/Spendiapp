import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Fonts } from '../config/fonts';
import type { AppColors } from '../config/colors';

/**
 * Las dos señales del Home que deciden si un fondo sirve: el saldo y la
 * tendencia.
 *
 * Un fondo no se elige mirando el fondo, sino comprobando si TU contenido se lee
 * encima. La tarjeta enseñaba el efecto a pelo y todos parecían bonitos; el que
 * se comía el saldo o apagaba el color del gráfico solo se descubría al
 * aplicarlo.
 *
 * Deliberadamente NO es una maqueta completa del Home. El lienzo de arriba de la
 * pantalla ya muestra el resultado entero en vivo, así que repetirlo en cada
 * tarjeta sería decir dos veces lo mismo — y multiplicarlo por catorce tarjetas.
 * Aquí van solo el importe y la curva, estáticos y baratos, con el centro libre
 * para que se vea el efecto, que es lo que se está eligiendo.
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
  const u = width / 160;
  const s = (n: number) => Math.round(n * u * 10) / 10;

  return (
    <View style={styles.root} pointerEvents="none">
      {/* El saldo, arriba: si aquí no se lee, el fondo no sirve. */}
      <View style={{ alignItems: 'center', paddingTop: s(18) }}>
        <View style={{ width: s(34), height: s(3.5), borderRadius: s(2), backgroundColor: themed.textPrimary, opacity: 0.28 }} />
        <Text
          style={{
            fontSize: s(20),
            lineHeight: s(26),
            fontFamily: Fonts.extraBold,
            color: themed.primary,
            letterSpacing: -0.5,
            marginTop: s(6),
          }}
          numberOfLines={1}
        >
          $4.286.500
        </Text>
      </View>

      {/* La tendencia, abajo: dice si el acento sobrevive sobre el fondo. */}
      <View style={{ height: s(24), marginBottom: s(18) }}>
        <Svg width="100%" height="100%" viewBox="0 0 100 24" preserveAspectRatio="none">
          <Path d={TREND} fill="none" stroke={chartColor} strokeWidth={2.2} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // El centro queda libre a propósito: ahí se ve el efecto.
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
});
