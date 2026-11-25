/**
 * Login con clave. Equivale a la entrada sin sesión de la web (HomePage >
 * HomeNotAuthenticated, Clean Poker oscuro): logo grande, "POKER ENFERMOS",
 * campo de clave espaciado y el botón rojo LOGIN (gris hasta que la clave es
 * válida). La app suma un
 * teclado numérico grande (y "ABC" para claves con letras). Tras el primer
 * login, si el teléfono tiene Face ID/huella, se ofrece activarla.
 */
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';

import logo from '@/assets/icons/logo.png';
import { PinPad } from '@/components/auth/PinPad';
import { CPButton } from '@/components/ui/CPButton';
import { Screen } from '@/components/ui/Screen';
import { Muted } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { isValidPinForLogin, PIN_MAX_LENGTH } from '@poker/shared';
import { cp, fonts } from '@/theme/colors';

export default function LoginScreen() {
  const { login, notice, clearNotice, shouldOfferBiometric, setBiometricEnabled, markBiometricOffered, biometric } =
    useAuth();
  const [pin, setPin] = useState('');
  const [letters, setLetters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const valid = isValidPinForLogin(pin);

  const update = (next: string) => {
    setPin(next.replace(/[^a-zA-Z0-9]/g, '').slice(0, PIN_MAX_LENGTH));
    if (error) setError('');
    if (notice) clearNotice();
  };

  const offerBiometric = async () => {
    if (!(await shouldOfferBiometric())) return;
    Alert.alert(
      `¿Entrar con ${biometric.label}?`,
      `La próxima vez podés abrir la app con ${biometric.label} en lugar de escribir la clave.`,
      [
        { text: 'Ahora no', style: 'cancel', onPress: () => void markBiometricOffered() },
        { text: 'Activar', onPress: () => void setBiometricEnabled(true) },
      ]
    );
  };

  const submit = async () => {
    if (!valid || loading) return;
    setLoading(true);
    setError('');
    const result = await login(pin);
    if (result.ok) {
      // El guard del layout ya navega a la app; el Alert se muestra encima.
      void offerBiometric();
      return;
    }
    setError(result.error);
    setPin('');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <Screen edges={['top', 'bottom']} contentClassName="flex-grow justify-center gap-6 pt-8">
        <View className="items-center">
          <Image source={logo} style={{ width: 140, height: 140, borderRadius: 70 }} contentFit="contain" alt="Poker Enfermos" />
          <Text
            className="mt-4 text-center text-cp-on-surface"
            style={{ fontFamily: fonts.display, fontSize: 24, letterSpacing: 1.2 }}>
            POKER ENFERMOS
          </Text>
          <Muted className="mt-1 text-center text-cp-on-surface-variant">Ingresá tu clave de acceso para continuar</Muted>
        </View>

        {/* Clave enmascarada: un punto por carácter */}
        <Pressable
          onPress={() => letters && inputRef.current?.focus()}
          className={`min-h-[52px] flex-row items-center justify-center gap-3 rounded-[12px] border bg-cp-surface-1 px-4 ${
            error ? 'border-cp-primary' : 'border-cp-surface-border'
          }`}>
          {letters ? (
            <TextInput
              ref={inputRef}
              value={pin}
              onChangeText={update}
              onSubmitEditing={submit}
              secureTextEntry
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              maxLength={PIN_MAX_LENGTH}
              placeholder="Ingresá tu clave"
              placeholderTextColor={cp.onSurfaceVariant}
              returnKeyType="go"
              editable={!loading}
              style={{ flex: 1, color: cp.onSurface, fontFamily: fonts.body, fontSize: 18, letterSpacing: 5, textAlign: 'center' }}
            />
          ) : pin.length === 0 ? (
            <Muted className="text-cp-on-surface-variant">Ingresá tu clave</Muted>
          ) : (
            Array.from({ length: pin.length }).map((_, i) => (
              <View key={i} className="h-3 w-3 rounded-full bg-cp-on-surface" />
            ))
          )}
        </Pressable>

        {notice || error ? (
          <Text
            className="text-center"
            style={{ fontFamily: fonts.body, fontSize: 13, color: error ? cp.primaryLight : cp.warning }}>
            {error || notice}
          </Text>
        ) : null}

        {letters ? (
          <CPButton title="Teclado numérico" variant="ghost" onPress={() => setLetters(false)} />
        ) : (
          <PinPad
            disabled={loading}
            onDigit={(d) => update(pin + d)}
            onDelete={() => update(pin.slice(0, -1))}
            onLetters={() => setLetters(true)}
          />
        )}

        {/* El LOGIN de la web: rojo con la clave válida, gris mientras tanto. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ingresar"
          accessibilityState={{ disabled: !valid || loading, busy: loading }}
          disabled={!valid || loading}
          onPress={submit}
          className="min-h-[56px] items-center justify-center rounded-[12px] active:opacity-80"
          style={{ backgroundColor: valid ? cp.primary : '#444444', opacity: loading || !valid ? 0.5 : 1 }}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 18, letterSpacing: 0.5, color: '#FFFFFF' }}>LOGIN</Text>
          )}
        </Pressable>
      </Screen>
    </KeyboardAvoidingView>
  );
}
