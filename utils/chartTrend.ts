/**
 * ¿El balance SUBE en el mes mostrado? Compara el último mes de la serie con el
 * ANTERIOR — que es lo que promete Personalización para los acentos "dinámicos":
 * "verde si tu balance sube este mes, rojo si baja".
 *
 * Antes se comparaba contra `values[0]`, el primer mes de la serie (6 meses
 * atrás). Con eso el acento quedaba clavado en verde salvo en una caída
 * sostenida de medio año: en una cuenta nueva `values[0]` vale 0, así que
 * cualquier balance ≥ 0 daba verde, y un mes que se hunde después de cinco
 * buenos también daba verde.
 *
 * Fuente única: la usan tanto el color resuelto como el crossfade del gráfico.
 * Módulo aparte (sin imports de React Native) para poder testearlo en node.
 */
export function isTrendUp(values?: number[]): boolean {
  if (!values || values.length < 2) return true;
  return values[values.length - 1] >= values[values.length - 2];
}
