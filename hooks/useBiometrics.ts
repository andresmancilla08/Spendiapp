import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const KEY_ENROLLED = 'biometrics_enrolled';
const KEY_OFFERED = 'biometrics_offered';

/** ¿El dispositivo tiene hardware biométrico y tiene huellas/face registradas en el SO? */
export async function isBiometricsAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/** ¿El usuario activó biometría en esta app? */
export async function isBiometricsAppEnrolled(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEY_ENROLLED);
  return val === 'true';
}

/** Activar o desactivar la biometría en esta app */
export async function setBiometricsAppEnrolled(value: boolean): Promise<void> {
  await SecureStore.setItemAsync(KEY_ENROLLED, value ? 'true' : 'false');
}

/** ¿Ya se le ofreció biometría al usuario en esta instalación? */
export async function wasBiometricsOffered(): Promise<boolean> {
  const val = await SecureStore.getItemAsync(KEY_OFFERED);
  return val === 'true';
}

/** Marcar que ya se ofreció biometría (para no volver a preguntar) */
export async function markBiometricsOffered(): Promise<void> {
  await SecureStore.setItemAsync(KEY_OFFERED, 'true');
}

/** Lanzar prompt de autenticación biométrica del SO */
export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Desbloquea Spendia',
    fallbackLabel: 'Usar PIN del dispositivo',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}
