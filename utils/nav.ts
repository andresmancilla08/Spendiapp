import { router } from 'expo-router';

/**
 * Vuelve a la pantalla anterior; si no hay ninguna, va a `fallback`.
 *
 * `router.back()` a secas no hace NADA cuando no hay historial, y el usuario se
 * queda encerrado en la pantalla. En web pasa cada vez que se recarga (F5) o se
 * abre un enlace directo a una vista de detalle, que es justo donde vive el
 * botón de volver.
 */
export function goBack(fallback: string = '/(tabs)/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}
