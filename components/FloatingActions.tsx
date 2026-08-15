import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { TAB_BAR_SPACE } from './AppTabBar';

/** Alto del FAB redondo (el mismo en todas las pantallas que lo usan). */
export const FAB_SIZE = 56;
/** Suelo del FAB en una pantalla CON tab bar: justo encima de la barra. */
export const FAB_BOTTOM = TAB_BAR_SPACE + 18;
/** Reserva al final del scroll en esas pantallas: barra + FAB + aire. Sin esto
 *  el último bloque de la lista se queda debajo del FAB sin poder apartarse,
 *  porque el scroll ya está en su tope. */
export const FAB_SPACE = FAB_BOTTOM + FAB_SIZE + 16;

/**
 * Reserva al final de una LISTA de tarjetas anchas (inicio, historial).
 *
 * `FAB_SPACE` reserva la altura completa del FAB, y eso deja un hueco de 182 px
 * bajo la última tarjeta: media pantalla vacía al llegar al final. El FAB flota
 * en una esquina, no ocupa el ancho — lo único que la lista necesita librar es
 * la barra de pestañas. Si la última tarjeta llega hasta abajo, el FAB se le
 * superpone en una esquina, que es justo lo que hace un botón flotante.
 */
export const LIST_BOTTOM_SPACE = TAB_BAR_SPACE + 24;

/**
 * Capa para lo que flota sobre el scroll: el FAB redondo y el botón de acción
 * fijo al fondo. En tablet/desktop se alinea con el ANCHO DEL CONTENIDO, el
 * mismo que usa la tab bar.
 *
 * Sin esto, un flotante posicionado contra la ventana se descuadra en cuanto la
 * pantalla es ancha: un `right: 20` acaba pegado al borde del navegador, a cientos
 * de píxeles de la lista, y un `left: 20 / right: 20` se estira hasta ~900 px de
 * botón. El contenido de las pantallas ya vive en 640 px centrados; los flotantes
 * tienen que vivir en la misma columna.
 */
export default function FloatingActions({ bottom, align = 'end', children }: {
  bottom: number;
  /** 'end' = FAB pegado a la derecha de la columna; 'stretch' = botón a lo ancho de ella. */
  align?: 'end' | 'stretch';
  children: React.ReactNode;
}) {
  const { isMobile, isDesktop } = useBreakpoint();
  return (
    // box-none: la capa cubre todo el ancho pero no debe robar toques al scroll
    // que hay debajo — solo sus hijos son tocables.
    <View pointerEvents="box-none" style={[styles.layer, { bottom }]}>
      <View
        pointerEvents="box-none"
        style={[
          styles.column,
          { alignItems: align === 'end' ? 'flex-end' : 'stretch' },
          !isMobile && { maxWidth: isDesktop ? 640 : 560 },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  column: { width: '100%', paddingHorizontal: 20 },
});
