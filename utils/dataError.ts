/**
 * Clasificación de errores de Firestore para poder decir la verdad en pantalla.
 *
 * Antes cualquier `err.code` se presentaba como "Configura Firestore": a un
 * usuario sin cobertura se le pedía tocar las reglas de seguridad. Los códigos
 * son los de firebase/firestore (`FirestoreError.code`).
 */
export type DataErrorKind = 'offline' | 'auth' | 'setup' | 'unknown';

export function classifyDataError(code: string | null | undefined): DataErrorKind | null {
  if (!code) return null;
  switch (code) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'resource-exhausted':
    case 'cancelled':
      return 'offline';
    case 'permission-denied':
    case 'unauthenticated':
      return 'auth';
    case 'failed-precondition':
    case 'invalid-argument':
      // Falta un índice o la consulta no es válida: es un fallo nuestro, no del usuario.
      return 'setup';
    default:
      return 'unknown';
  }
}

/** Solo los transitorios merecen un botón de reintentar. */
export function isRetryable(kind: DataErrorKind): boolean {
  return kind === 'offline' || kind === 'unknown';
}
