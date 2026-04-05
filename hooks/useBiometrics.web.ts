// Web stub — biometrics are not available in the browser.
// Metro bundler picks this file automatically for web builds.

export async function isBiometricsAvailable(): Promise<boolean> {
  return false;
}

export async function isBiometricsAppEnrolled(): Promise<boolean> {
  return false;
}

export async function setBiometricsAppEnrolled(_value: boolean): Promise<void> {}

// Return true so the offer dialog is never shown on web
export async function wasBiometricsOffered(): Promise<boolean> {
  return true;
}

export async function markBiometricsOffered(): Promise<void> {}

export async function authenticateWithBiometrics(): Promise<boolean> {
  return false;
}
