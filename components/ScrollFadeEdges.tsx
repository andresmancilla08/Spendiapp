import { Platform } from 'react-native';

/**
 * Máscara para los bordes de una lista: el CONTENIDO se desvanece al acercarse
 * al header o a la tab bar en vez de cortarse contra una línea.
 *
 * Se aplica al propio ScrollView, no como capa encima. Es deliberado: la
 * primera versión ponía un `backdrop-filter` sobre la franja y desenfocaba
 * también el FONDO ANIMADO, que en las zonas seguras aparecía borroso mientras
 * en el centro seguía nítido — se leía como dos fondos distintos y sin
 * sincronizar. Una máscara solo afecta al contenido: el fondo queda intacto y
 * continuo de borde a borde.
 *
 * Solo web (la app se distribuye como PWA); en nativo devuelve `null` y la
 * lista se comporta como siempre.
 */
export function scrollFadeMask(top: number, bottom: number) {
  if (Platform.OS !== 'web') return null;
  // Tramos de desvanecido: cortos, para que solo afecten al contenido que ya
  // está saliendo y no aclaren tarjetas que se leen enteras.
  const fade = 26;
  const mask =
    'linear-gradient(to bottom, ' +
    `transparent 0px, rgba(0,0,0,1) ${top + fade}px, ` +
    `rgba(0,0,0,1) calc(100% - ${bottom + fade}px), transparent calc(100% - ${bottom}px))`;
  return { maskImage: mask, WebkitMaskImage: mask } as any;
}
