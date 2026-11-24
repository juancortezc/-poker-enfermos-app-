/**
 * Mi perfil (web: /perfil). Datos propios editables (teléfono, email,
 * cumpleaños y clave) contra `PUT /api/profile`, como DatosTab de la web.
 *
 * Las pestañas de la web Alertas / App / Salir se resuelven distinto en el
 * teléfono: alertas → ayuda de notificaciones (las push nativas son de F4),
 * "App" (instalar PWA) no aplica, y salir/biometría quedan aquí abajo.
 *
 * "Cuentas vinculadas" (Google/Apple) queda como hueco marcado para F7.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName, getRestrictionMessage, isValidPinForCreation, PIN_MAX_LENGTH, PIN_RULE_TEXT } from '@poker/shared';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, Switch, Text, TextInput, View, type TextInputProps } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { POSITIVE } from '@/components/jugador/Bits';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState, RestrictedState } from '@/components/ui/States';
import { Body, Muted, Overline, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile, type Profile } from '@/hooks/useProfile';
import { useRefresh } from '@/hooks/useRefresh';
import { fonts, noir } from '@/theme/colors';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function PerfilScreen() {
  const { can, role } = useAuth();

  if (!can('profile')) {
    return (
      <>
        <Stack.Screen options={{ title: 'Mi perfil' }} />
        <Screen scroll={false}>
          <RestrictedState message={role ? getRestrictionMessage(role, 'profile') : 'Iniciá sesión para ver tu perfil.'} />
        </Screen>
      </>
    );
  }
  return <PerfilContent />;
}

function PerfilContent() {
  const { profile, error, isLoading, mutate, save } = useProfile();
  const { refreshing, onRefresh } = useRefresh(mutate);

  return (
    <>
      <Stack.Screen options={{ title: 'Mi perfil' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <Screen refreshing={refreshing} onRefresh={onRefresh}>
          {isLoading && !profile ? (
            <LoadingState message="Cargando perfil…" />
          ) : error && !profile ? (
            <ErrorState error={error} onRetry={() => mutate()} />
          ) : profile ? (
            <>
              <ProfileHero profile={profile} />
              <DatosForm profile={profile} save={save} />
              <LinkedAccountsSlot />
              <SessionSection />
            </>
          ) : null}
        </Screen>
      </KeyboardAvoidingView>
    </>
  );
}

function ProfileHero({ profile }: { profile: Profile }) {
  return (
    <NoirCard accent className="items-center gap-2">
      <PlayerAvatar name={fullName(profile)} photoUrl={profile.photoUrl} size={88} ringColor={noir.gold} />
      <Title className="text-center text-xl">{fullName(profile)}</Title>
      {profile.aliases?.[0] ? <Text className="font-inter text-sm italic text-noir-gold">“{profile.aliases[0]}”</Text> : null}
      {profile.role === 'Comision' ? (
        <Text className="overflow-hidden rounded bg-noir-copper/30 px-3 py-1 font-inter-semibold text-xs text-noir-text">Comisión</Text>
      ) : null}
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/players/[id]', params: { id: profile.id } })}
        className="min-h-[44px] justify-center active:opacity-60">
        <Text className="font-inter-bold text-xs uppercase tracking-[1.5px] text-noir-gold">Ver mi torneo →</Text>
      </Pressable>
    </NoirCard>
  );
}

function DatosForm({ profile, save }: { profile: Profile; save: ReturnType<typeof useProfile>['save'] }) {
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [email, setEmail] = useState(profile.email ?? '');
  const [birthDate, setBirthDate] = useState(profile.birthDate?.split('T')[0] ?? '');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const cleanPin = (t: string) => t.replace(/[^a-zA-Z0-9]/g, '').slice(0, PIN_MAX_LENGTH);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    if (pin || confirmPin) {
      if (pin !== confirmPin) return setError('Las claves no coinciden');
      if (!isValidPinForCreation(pin)) return setError(`${PIN_RULE_TEXT}.`);
    }
    if (birthDate && !DATE_RE.test(birthDate)) return setError('La fecha de cumpleaños va como AAAA-MM-DD.');

    setSaving(true);
    const result = await save({ phone: phone.trim(), email: email.trim(), birthDate, pin: pin || undefined });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setPin('');
    setConfirmPin('');
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <>
      <NoirCard className="gap-3">
        <Overline>Datos de contacto</Overline>
        <Field icon="call-outline" value={phone} onChangeText={setPhone} placeholder="Celular" keyboardType="phone-pad" textContentType="telephoneNumber" />
        <Field
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          textContentType="emailAddress"
        />
        <Field
          icon="gift-outline"
          value={birthDate}
          onChangeText={(t) => setBirthDate(t.replace(/[^\d-]/g, '').slice(0, 10))}
          placeholder="Cumpleaños (AAAA-MM-DD)"
          keyboardType="numbers-and-punctuation"
        />
      </NoirCard>

      <NoirCard className="gap-3">
        <Overline>Cambiar clave</Overline>
        <Muted>Dejala en blanco para mantener la actual. {PIN_RULE_TEXT}.</Muted>
        <Field
          icon="key-outline"
          value={pin}
          onChangeText={(t) => setPin(cleanPin(t))}
          placeholder="Nueva clave"
          secureTextEntry={!showPin}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          right={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPin ? 'Ocultar clave' : 'Mostrar clave'}
              onPress={() => setShowPin(!showPin)}
              hitSlop={10}>
              <Ionicons name={showPin ? 'eye-off-outline' : 'eye-outline'} size={18} color={noir.muted} />
            </Pressable>
          }
        />
        <Field
          icon="key-outline"
          value={confirmPin}
          onChangeText={(t) => setConfirmPin(cleanPin(t))}
          placeholder="Confirmar clave"
          secureTextEntry={!showPin}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
        />
      </NoirCard>

      {error ? (
        <NoirCard className="border-noir-copper/60 py-3">
          <Text className="text-center font-inter text-sm" style={{ color: noir.danger }}>
            {error}
          </Text>
        </NoirCard>
      ) : null}
      {success ? (
        <NoirCard className="py-3" style={{ borderColor: `${POSITIVE}66` }}>
          <Text className="text-center font-inter text-sm" style={{ color: POSITIVE }}>
            Perfil actualizado correctamente
          </Text>
        </NoirCard>
      ) : null}

      <NoirButton title={saving ? 'Guardando…' : 'Guardar cambios'} loading={saving} onPress={handleSave} />
    </>
  );
}

function Field({ icon, right, ...input }: TextInputProps & { icon: React.ComponentProps<typeof Ionicons>['name']; right?: React.ReactNode }) {
  return (
    <View className="min-h-[48px] flex-row items-center gap-3 rounded-xl border border-noir-border bg-noir-bg px-3">
      <Ionicons name={icon} size={18} color={noir.muted} />
      <TextInput
        placeholderTextColor={`${noir.muted}88`}
        accessibilityLabel={typeof input.placeholder === 'string' ? input.placeholder : undefined}
        style={{ flex: 1, fontFamily: fonts.body, fontSize: 16, color: noir.text, paddingVertical: 12 }}
        {...input}
      />
      {right}
    </View>
  );
}

/**
 * HUECO PARA F7 · Cuentas vinculadas (Google / Apple).
 * El agente de F7 reemplaza este bloque por la vinculación real
 * (POST /api/auth/google, /api/auth/apple, desvincular).
 */
function LinkedAccountsSlot() {
  return (
    <NoirCard className="gap-2" style={{ borderStyle: 'dashed' }}>
      <Overline>Cuentas vinculadas</Overline>
      <View className="flex-row items-center gap-3">
        <Ionicons name="logo-google" size={18} color={noir.muted} />
        <Ionicons name="logo-apple" size={20} color={noir.muted} />
        <Muted className="flex-1">Pronto vas a poder entrar con Google o Apple además de tu clave.</Muted>
      </View>
    </NoirCard>
  );
}

function SessionSection() {
  const { biometric, biometricEnabled, setBiometricEnabled, logout } = useAuth();

  const toggle = async (value: boolean) => {
    const ok = await setBiometricEnabled(value);
    if (!ok && value) Alert.alert('No se pudo activar', `No se confirmó ${biometric.label}.`);
  };

  const confirmLogout = () =>
    Alert.alert('Cerrar sesión', 'Vas a tener que volver a ingresar tu clave.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);

  return (
    <>
      <NoirCard className="gap-1 p-0">
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push('/ayuda/notificaciones')}
          className="min-h-[56px] flex-row items-center gap-3 px-5 active:bg-noir-raised">
          <Ionicons name="notifications-outline" size={20} color={noir.gold} />
          <Body className="flex-1 text-base">Notificaciones</Body>
          <Ionicons name="chevron-forward" size={18} color={noir.muted} />
        </Pressable>
        {biometric.available ? (
          <View className="min-h-[56px] flex-row items-center gap-3 border-t border-noir-border px-5">
            <Ionicons name={biometric.kind === 'faceid' ? 'scan-outline' : 'finger-print-outline'} size={20} color={noir.gold} />
            <Body className="flex-1 text-base">Entrar con {biometric.label}</Body>
            <Switch
              value={biometricEnabled}
              onValueChange={toggle}
              trackColor={{ true: noir.copper, false: noir.border }}
              thumbColor={biometricEnabled ? noir.gold : noir.muted}
            />
          </View>
        ) : null}
      </NoirCard>
      <NoirButton title="Cerrar sesión" variant="outline" onPress={confirmLogout} />
    </>
  );
}
