import * as LocalAuthentication from 'expo-local-authentication';

export type BiometricKind = 'faceid' | 'fingerprint' | 'iris' | 'generic';

export type BiometricSupport = {
  /** Hay hardware y el usuario tiene al menos una huella/cara registrada. */
  available: boolean;
  kind: BiometricKind;
  /** Nombre para mostrar: "Face ID", "huella", etc. */
  label: string;
};

export async function getBiometricSupport(): Promise<BiometricSupport> {
  try {
    const [hasHardware, enrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    const T = LocalAuthentication.AuthenticationType;
    let kind: BiometricKind = 'generic';
    if (types.includes(T.FACIAL_RECOGNITION)) kind = 'faceid';
    else if (types.includes(T.FINGERPRINT)) kind = 'fingerprint';
    else if (types.includes(T.IRIS)) kind = 'iris';

    const label =
      kind === 'faceid' ? 'Face ID' : kind === 'fingerprint' ? 'huella' : kind === 'iris' ? 'iris' : 'biometría';
    return { available: hasHardware && enrolled, kind, label };
  } catch {
    return { available: false, kind: 'generic', label: 'biometría' };
  }
}

/** Pide la biometría. `true` solo si el usuario se autenticó. */
export async function authenticateWithBiometrics(promptMessage: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Usar clave',
      // El fallback es nuestra pantalla de clave, no el código del teléfono.
      disableDeviceFallback: true,
    });
    return result.success;
  } catch {
    return false;
  }
}
