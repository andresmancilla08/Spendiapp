/** Longitud del PIN de acceso. Fue de 4 hasta 2.63.0. */
export const PIN_LENGTH = 6;

/** Longitud del código de recuperación que llega por email (no es el PIN). */
export const OTP_LENGTH = 4;

/**
 * PIN asignado a todas las cuentas en la migración a 6 dígitos. Quien lo tenga
 * está obligado a crear el suyo antes de poder usar la app — ver `pinV2` en el
 * perfil y el gate de `app/_layout.tsx`.
 */
export const DEFAULT_MIGRATION_PIN = '123456';

/** `PinInput` deja huecos mientras se escribe: solo vale si son todo dígitos. */
export function isPinComplete(value: string, length: number = PIN_LENGTH): boolean {
  return new RegExp(`^\\d{${length}}$`).test(value);
}
