/**
 * Selector de jugador por fichas. En la mesa es más rápido que un desplegable:
 * un toque elige, otro toque al mismo lo quita. Con muchos jugadores aparece
 * un buscador.
 */
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useCP } from '@/theme/tone';

import type { DatePlayer } from './types';

const SEARCH_FROM = 12;

export function playerName(p: Pick<DatePlayer, 'firstName' | 'lastName'>): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function PlayerChips({
  players,
  selectedId,
  onSelect,
  disabled = false,
  accent = 'primary',
}: {
  players: DatePlayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  /** primary: rojo (quien elimina / gana); negative: naranja (quien sale). */
  accent?: 'primary' | 'negative';
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? players.filter((p) => playerName(p).toLowerCase().includes(q)) : players;
  const c = useCP();
  const selectedBg = accent === 'primary' ? 'bg-cp-primary border-cp-primary' : 'bg-cp-negative border-cp-negative';
  const selectedText = accent === 'primary' ? 'text-cp-on-primary' : 'text-cp-surface-0';

  return (
    <View className="gap-2">
      {players.length >= SEARCH_FROM ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar…"
          placeholderTextColor={c.onSurfaceVariant}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          clearButtonMode="while-editing"
          className="min-h-[44px] rounded-cp border border-cp-surface-border bg-cp-surface-1 px-3 font-inter text-base text-cp-on-surface"
        />
      ) : null}
      <View className="flex-row flex-wrap gap-2">
        {visible.map((p) => {
          const selected = p.id === selectedId;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              disabled={disabled}
              onPress={() => onSelect(selected ? null : p.id)}
              className={`min-h-[44px] justify-center rounded-full border px-4 ${
                selected ? selectedBg : 'border-cp-surface-border bg-cp-surface-2'
              } ${disabled ? 'opacity-50' : 'active:opacity-80'}`}>
              <Text className={`font-inter-medium text-base ${selected ? selectedText : 'text-cp-on-surface'}`}>
                {playerName(p)}
              </Text>
            </Pressable>
          );
        })}
        {visible.length === 0 ? (
          <Text className="font-inter text-sm text-cp-on-surface-muted">Nadie con ese nombre.</Text>
        ) : null}
      </View>
    </View>
  );
}
