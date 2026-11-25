/**
 * Contactos del grupo (web: /contactos): socios activos (Enfermo y Comisión),
 * uno mismo primero y el resto por nombre. En el teléfono cada contacto se
 * puede llamar, escribir por WhatsApp o por correo.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName } from '@poker/shared';
import { Stack } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Linking, Pressable, RefreshControl, Text, View } from 'react-native';

import { PlayerAvatar } from '@/components/common/PlayerAvatar';
import { SearchField } from '@/components/jugador/Bits';
import { Screen } from '@/components/ui/Screen';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { useRefresh } from '@/hooks/useRefresh';
import { isMember, matchesSearch, usePlayers, type DirectoryPlayer } from '@/hooks/usePlayers';
import { cpLight as c } from '@/theme/colors';

/** Verde de marca de WhatsApp: identifica la app, no es del sistema. */
const WHATSAPP = '#25D366';
/** Prefijo de Ecuador para números locales (0991234567 → 593991234567). */
const DEFAULT_COUNTRY = '593';

function formatBirthday(birthDate: string | null | undefined): string | null {
  if (!birthDate) return null;
  const date = new Date(`${birthDate.split('T')[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getDate()} ${date.toLocaleDateString('es-ES', { month: 'short' })}`;
}

/** Número internacional sin signos, como lo pide wa.me. */
function whatsappNumber(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return digits.slice(1);
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return DEFAULT_COUNTRY + digits.slice(1);
  return digits;
}

async function open(url: string, fallback?: string) {
  try {
    await Linking.openURL(url);
  } catch {
    if (fallback) {
      Linking.openURL(fallback).catch(() => Alert.alert('No se pudo abrir', 'Probá desde la app correspondiente.'));
    } else {
      Alert.alert('No se pudo abrir', 'Este dispositivo no puede hacer esta acción.');
    }
  }
}

export default function ContactosScreen() {
  const { user } = useAuth();
  const { players, error, isLoading, mutate } = usePlayers();
  const [search, setSearch] = useState('');
  const { refreshing, onRefresh } = useRefresh(mutate);

  const members = useMemo(() => (players ?? []).filter((p) => isMember(p) && p.isActive), [players]);
  const contacts = members
    .filter((p) => matchesSearch(p, search))
    .sort((a, b) => {
      if (user?.id === a.id) return -1;
      if (user?.id === b.id) return 1;
      return a.firstName.localeCompare(b.firstName, 'es', { sensitivity: 'base' });
    });

  return (
    <>
      <Stack.Screen options={{ title: players ? `Contactos · ${members.length}` : 'Contactos' }} />
      <Screen tone="light" scroll={false}>
        <View className="pb-3">
          <SearchField value={search} onChangeText={setSearch} />
        </View>
        {isLoading && !players ? (
          <LoadingState message="Cargando contactos…" />
        ) : error && !players ? (
          <ErrorState error={error} onRetry={() => mutate()} />
        ) : (
          <FlatList
            data={contacts}
            keyExtractor={(p) => p.id}
            contentContainerClassName="gap-2 pb-10"
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
            ListEmptyComponent={<EmptyState icon="people-outline" message="No se encontraron jugadores." />}
            renderItem={({ item }) => <ContactCard player={item} isMe={item.id === user?.id} />}
          />
        )}
      </Screen>
    </>
  );
}

function ContactCard({ player, isMe }: { player: DirectoryPlayer; isMe: boolean }) {
  const name = fullName(player);
  const birthday = formatBirthday(player.birthDate);
  const phone = player.phone?.trim();
  const email = player.email?.trim();

  return (
    <View className="gap-3 rounded-card border border-cp-surface-border bg-cp-surface-1 p-4">
      <View className="flex-row items-center gap-3">
        <PlayerAvatar name={name} photoUrl={player.photoUrl} size={52} playerId={player.id} linkToProfile />
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="shrink font-inter-bold text-base text-cp-on-surface">
              {name}
              {isMe ? <Text className="font-inter text-cp-on-surface-muted"> (Tú)</Text> : null}
            </Text>
            {player.role === 'Comision' ? (
              <View className="h-5 w-5 items-center justify-center rounded-full bg-cp-primary">
                <Text className="font-inter-bold text-[10px] text-white">C</Text>
              </View>
            ) : null}
          </View>
          {phone ? <Muted>{phone}</Muted> : null}
          {email ? (
            <Muted numberOfLines={1} className="text-xs">
              {email}
            </Muted>
          ) : null}
          {birthday ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="gift-outline" size={12} color={c.onSurfaceMuted} />
              <Muted className="text-xs">{birthday}</Muted>
            </View>
          ) : null}
          {!phone && !email && !birthday ? <Muted className="text-xs">Sin datos de contacto</Muted> : null}
        </View>
      </View>

      {!isMe && (phone || email) ? (
        <View className="flex-row gap-2">
          {phone ? (
            <ActionButton icon="call" label="Llamar" color={c.info} onPress={() => open(`tel:${phone.replace(/\s+/g, '')}`)} />
          ) : null}
          {phone ? (
            <ActionButton
              icon="logo-whatsapp"
              label="WhatsApp"
              color={WHATSAPP}
              onPress={() => {
                const n = whatsappNumber(phone);
                open(`whatsapp://send?phone=${n}`, `https://wa.me/${n}`);
              }}
            />
          ) : null}
          {email ? <ActionButton icon="mail" label="Correo" color={c.onSurfaceMuted} onPress={() => open(`mailto:${email}`)} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-cp border border-cp-surface-border bg-cp-surface-2 active:opacity-70">
      <Ionicons name={icon} size={18} color={color} />
      <Text className="font-inter-semibold text-sm text-cp-on-surface">{label}</Text>
    </Pressable>
  );
}
