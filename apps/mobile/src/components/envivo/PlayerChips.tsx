/**
 * Selector de jugador por fichas. En la mesa es más rápido que un desplegable:
 * un toque elige, otro toque al mismo lo quita. Con muchos jugadores aparece
 * un buscador.
 */
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { noir } from '@/theme/colors';

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
  accent = 'gold',
}: {
  players: DatePlayer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  accent?: 'gold' | 'copper';
}) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q ? players.filter((p) => playerName(p).toLowerCase().includes(q)) : players;
  const selectedBg = accent === 'gold' ? 'bg-noir-gold border-noir-gold' : 'bg-noir-copper border-noir-copper';
  const selectedText = accent === 'gold' ? 'text-noir-bg' : 'text-noir-text';

  return (
    <View className="gap-2">
      {players.length >= SEARCH_FROM ? (
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar…"
          placeholderTextColor={noir.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="done"
          clearButtonMode="while-editing"
          className="min-h-[44px] rounded-xl border border-noir-border bg-noir-bg px-3 font-inter text-base text-noir-text"
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
                selected ? selectedBg : 'border-noir-border bg-noir-raised'
              } ${disabled ? 'opacity-50' : 'active:opacity-80'}`}>
              <Text className={`font-inter-medium text-base ${selected ? selectedText : 'text-noir-text'}`}>
                {playerName(p)}
              </Text>
            </Pressable>
          );
        })}
        {visible.length === 0 ? (
          <Text className="font-inter text-sm text-noir-muted">Nadie con ese nombre.</Text>
        ) : null}
      </View>
    </View>
  );
}
