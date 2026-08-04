import { View, StyleSheet, Platform } from 'react-native';

/**
 * Difuminado de borde: el contenido que se desliza por debajo del header o de
 * la tab bar se desenfoca de forma progresiva en vez de cortarse contra una
 * línea. Es el recurso de iOS e Instagram.
 *
 * Se monta DENTRO de la barra que lo usa (con `pointerEvents="none"`) y se
 * estira hasta el borde FÍSICO de la pantalla con `extend`, para que el
 * desenfoque tape también la zona segura: si se queda en el borde del área
 * segura, aparece justo ahí la línea que se quería evitar.
 *
 * Tres capas con blur creciente hacia el borde. Un `backdrop-filter` único se
 * lee como una banda de canto duro; escalonado, el desenfoque crece de forma
 * continua y no hay canto.
 *
 * Solo web: en nativo haría falta `expo-blur`, que no está instalado, y la app
 * se distribuye como PWA.
 */

/** Fracción del alto que cubre cada capa (de la más externa a la más interna). */
const LAYERS = [
  { span: 1, blur: 14 },
  { span: 0.66, blur: 7 },
  { span: 0.34, blur: 3 },
] as const;

interface Props {
  /** Alto del difuminado dentro de la barra, en px. */
  height: number;
  /** Borde al que se pega: 'top' para el header, 'bottom' para la tab bar. */
  edge: 'top' | 'bottom';
  /** Píxeles extra hacia fuera para cubrir la zona segura del dispositivo. */
  extend?: number;
}

export default function ScrollFadeEdges({ height, edge, extend = 0 }: Props) {
  if (Platform.OS !== 'web' || height <= 0) return null;

  const total = height + extend;
  // La máscara arranca opaca en el borde exterior y muere hacia dentro. El
  // tramo opaco solo cubre la zona segura + un poco: a partir de ahí el
  // desenfoque se desvanece, que es lo que borra el canto.
  const solid = Math.round(((extend + 6) / total) * 100);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        edge === 'top' ? { top: -extend } : { bottom: -extend },
        { height: total },
      ]}
    >
      {LAYERS.map(({ span, blur }, i) => {
        const towards = edge === 'top' ? 'bottom' : 'top';
        const end = Math.round(solid + (100 - solid) * span);
        const mask = `linear-gradient(to ${towards}, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${solid}%, rgba(0,0,0,0) ${end}%)`;
        return (
          <View
            key={i}
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backdropFilter: `blur(${blur}px)`,
                WebkitBackdropFilter: `blur(${blur}px)`,
                maskImage: mask,
                WebkitMaskImage: mask,
              } as any,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0 },
});
