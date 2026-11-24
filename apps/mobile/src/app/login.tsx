/**
 * Login con clave. Equivale a src/components/LoginForm.tsx de la web, con un
 * teclado numérico grande (y "ABC" para claves con letras). Tras el primer
 * login, si el teléfono tiene Face ID/huella, se ofrece activarla.
 */
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';

import logo from '@/assets/icons/favicon-512.png';
import { PinPad } from '@/components/auth/PinPad';
import { NoirButton } from '@/components/ui/NoirButton';
import { Screen } from '@/components/ui/Screen';
import { Muted, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { isValidPinForLogin, PIN_MAX_LENGTH } from '@poker/shared';
import { fonts, noir } from '@/theme/colors';

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
        <View className="items-center gap-3">
          <Image source={logo} style={{ width: 128, height: 128 }} contentFit="contain" alt="Poker Enfermos" />
          <Title className="text-center text-3xl">Poker Enfermos</Title>
          <Muted className="text-center">Ingresá tu clave de acceso para continuar</Muted>
        </View>

        {/* Clave enmascarada: un punto por carácter */}
        <Pressable
          onPress={() => letters && inputRef.current?.focus()}
          className="min-h-[56px] flex-row items-center justify-center gap-3 rounded-2xl border border-noir-border bg-noir-surface px-4">
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
              placeholderTextColor={noir.muted}
              returnKeyType="go"
              editable={!loading}
              style={{ flex: 1, color: noir.text, fontFamily: fonts.body, fontSize: 20, textAlign: 'center' }}
            />
          ) : pin.length === 0 ? (
            <Muted>Tu clave</Muted>
          ) : (
            Array.from({ length: pin.length }).map((_, i) => (
              <View key={i} className="h-3.5 w-3.5 rounded-full bg-noir-gold" />
            ))
          )}
        </Pressable>

        {notice || error ? (
          <View className="rounded-xl border border-noir-copper/60 bg-noir-copper/15 p-3">
            <Muted className="text-center text-noir-text">{error || notice}</Muted>
          </View>
        ) : null}

        {letters ? (
          <NoirButton title="Teclado numérico" variant="ghost" onPress={() => setLetters(false)} />
        ) : (
          <PinPad
            disabled={loading}
            onDigit={(d) => update(pin + d)}
            onDelete={() => update(pin.slice(0, -1))}
            onLetters={() => setLetters(true)}
          />
        )}

        <NoirButton title="Ingresar" size="lg" onPress={submit} disabled={!valid} loading={loading} />
      </Screen>
    </KeyboardAvoidingView>
  );
}
