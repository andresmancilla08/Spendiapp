/**
 * Fusión de las paletas propias que llegan de Firestore con las que ya hay en
 * este dispositivo.
 *
 * Existe por un bug concreto: `PaletteLoader` hidrataba llamando a
 * `saveCustomPalette` una vez por paleta, en el mismo tick. Cada llamada leía
 * el `customPalettes` capturado en el closure de ESE render, así que las N
 * partían todas de la misma lista vieja y `persistCustom` reescribía la clave
 * entera de AsyncStorage — sobrevivía solo la última. Quien tuviera dos paletas
 * propias perdía una, y si la perdida era la activa la app se pintaba con la
 * paleta por defecto y en Perfil salía el id crudo
 * («profile.palette.custom_1788476033485») porque `find` ya no la encontraba.
 *
 * La lista remota MANDA sobre la local para un mismo id: viene de
 * `updateCustomPalettes`, que escribe la lista completa, y es la que sobrevive a
 * reinstalar la app. Lo local que no está en remoto se conserva igual — puede
 * ser una paleta recién creada cuyo `updateCustomPalettes` aún no ha subido.
 */
export function mergeCustomPalettes<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const safeRemote = Array.isArray(remote) ? remote.filter((p) => p && typeof p.id === 'string') : [];
  const safeLocal = Array.isArray(local) ? local.filter((p) => p && typeof p.id === 'string') : [];
  const remoteIds = new Set(safeRemote.map((p) => p.id));
  return [...safeRemote, ...safeLocal.filter((p) => !remoteIds.has(p.id))];
}
