/**
 * Selector táctil de jugadores: equivale a PlayerSelector y GuestSelector de
 * la web. Buscador, todos/ninguno y una grilla de dos columnas con casillas
 * de 48 pt. Lo usan torneos (participantes), activar fecha y editar fecha.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { fullName } from '@poker/shared';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { SearchField } from '@/components/jugador/Bits';
import { PlayerAvatar, avatarProps } from '@/components/common/PlayerAvatar';
import { Muted } from '@/components/ui/Typography';
import { noir } from '@/theme/colors';

import type { AdminPlayer } from './api';

type Props = {
  players: AdminPlayer[];
  selected: string[];
  onChange: (ids: string[]) => void;
  /** Texto secundario por jugador (p. ej. "Invitado de …"). */
  detail?: (player: AdminPlayer) => string | undefined;
  /** Jugadores visibles pero bloqueados (p. ej. ya eliminados). */
  disabledIds?: ReadonlySet<string>;
  accent?: string;
  emptyMessage?: string;
  showBulk?: boolean;
};

function matches(p: AdminPlayer, term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return (
    p.firstName.toLowerCase().includes(t) ||
    p.lastName.toLowerCase().includes(t) ||
    (p.aliases ?? []).some((a) => a.toLowerCase().includes(t))
  );
}

export function PlayerPicker({
  players,
  selected,
  onChange,
  detail,
  disabledIds,
  accent = noir.gold,
  emptyMessage = 'No hay jugadores para elegir.',
  showBulk = true,
}: Props) {
  const [search, setSearch] = useState('');
  const visible = players.filter((p) => matches(p, search));
  const selectedSet = new Set(selected);
  const selectedHere = players.filter((p) => selectedSet.has(p.id)).length;

  const toggle = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  const setAll = (on: boolean) => {
    const ids = new Set(visible.filter((p) => !disabledIds?.has(p.id)).map((p) => p.id));
    onChange(on ? [...new Set([...selected, ...ids])] : selected.filter((id) => !ids.has(id)));
  };

  return (
    <View className="gap-3">
      {players.length > 6 ? <SearchField value={search} onChangeText={setSearch} /> : null}
      {showBulk && players.length > 0 ? (
        <View className="flex-row items-center justify-between">
          <Muted>
            {selectedHere} de {players.length} elegidos
          </Muted>
          <View className="flex-row gap-1">
            <BulkButton label="Todos" onPress={() => setAll(true)} />
            <BulkButton label="Ninguno" onPress={() => setAll(false)} />
          </View>
        </View>
      ) : null}
      {visible.length === 0 ? (
        <Muted className="py-4 text-center">{players.length === 0 ? emptyMessage : 'Nadie coincide con la búsqueda.'}</Muted>
      ) : (
        <View className="flex-row flex-wrap justify-between gap-y-2">
          {visible.map((p) => {
            const on = selectedSet.has(p.id);
            const disabled = disabledIds?.has(p.id) ?? false;
            const sub = detail?.(p);
            return (
              <Pressable
                key={p.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled }}
                accessibilityLabel={fullName(p)}
                disabled={disabled}
                onPress={() => toggle(p.id)}
                style={{ width: '49%', borderColor: on ? accent : noir.border, backgroundColor: on ? `${accent}1A` : noir.surface }}
                className={`min-h-[52px] flex-row items-center gap-2 rounded-xl border px-2 py-1.5 ${disabled ? 'opacity-40' : 'active:opacity-80'}`}>
                <PlayerAvatar {...avatarProps(p)} size={30} ringColor={on ? accent : noir.border} />
                <View className="flex-1">
                  <Text numberOfLines={1} className="font-inter-semibold text-sm text-noir-text">
                    {fullName(p)}
                  </Text>
                  {sub ? (
                    <Text numberOfLines={1} className="font-inter text-[11px] text-noir-muted">
                      {sub}
                    </Text>
                  ) : null}
                </View>
                <View
                  className="h-5 w-5 items-center justify-center rounded-md border"
                  style={{ borderColor: on ? accent : noir.muted, backgroundColor: on ? accent : 'transparent' }}>
                  {on ? <Ionicons name="checkmark" size={14} color={noir.bg} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function BulkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="min-h-[44px] justify-center rounded-full px-3 active:bg-noir-raised">
      <Text className="font-inter-semibold text-xs uppercase tracking-[1px] text-noir-gold">{label}</Text>
    </Pressable>
  );
}
