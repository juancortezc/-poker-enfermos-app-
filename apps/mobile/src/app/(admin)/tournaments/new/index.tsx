/**
 * Nuevo torneo, paso 1: el número. Paridad con TournamentStartPage de la web
 * (sugiere el siguiente de /api/tournaments/next-number) y además avisa antes
 * de seguir si el número ya existe o si hay un torneo activo, que la API
 * rechazaría recién al final del formulario.
 */
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import useSWR from 'swr';

import { useNextTournamentNumber, type TournamentListItem } from '@/components/admin/api';
import { FormError, Notice } from '@/components/admin/Form';
import { Header } from '@/components/ui/Header';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Muted } from '@/components/ui/Typography';
import { fonts, noir } from '@/theme/colors';

export default function NewTournamentScreen() {
  const next = useNextTournamentNumber();
  const all = useSWR<TournamentListItem[]>('/api/tournaments');
  const [text, setText] = useState<string | null>(null);

  const header = <Stack.Screen options={{ title: 'Nuevo torneo' }} />;

  if ((next.isLoading && !next.data) || (all.isLoading && !all.data)) {
    return (
      <Screen>
        {header}
        <LoadingState />
      </Screen>
    );
  }
  if (next.error || all.error) {
    return (
      <Screen>
        {header}
        <ErrorState error={next.error ?? all.error} onRetry={() => (next.mutate(), all.mutate())} />
      </Screen>
    );
  }

  const suggested = next.data?.nextNumber ?? 1;
  const value = text ?? String(suggested);
  const number = parseInt(value, 10);
  const valid = Number.isInteger(number) && number >= 1 && number <= 999;
  const duplicate = valid && (all.data ?? []).some((t) => t.number === number);
  const active = (all.data ?? []).find((t) => t.status === 'ACTIVO');

  return (
    <Screen>
      {header}
      <Header overline="Comisión" title="Nuevo torneo" subtitle="Elegí el número y seguí con jugadores, fechas y blinds." />
      <NoirCard accent className="items-center gap-3">
        <TextInput
          value={value}
          onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 3))}
          keyboardType="number-pad"
          accessibilityLabel="Número del torneo"
          selectTextOnFocus
          style={{
            width: '100%',
            textAlign: 'center',
            fontFamily: fonts.headingBold,
            fontSize: 64,
            color: noir.gold,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderColor: noir.border,
          }}
        />
        {valid && number !== suggested ? <Muted>Número modificado (sugerido: {suggested})</Muted> : null}
      </NoirCard>

      {!valid ? <FormError message="El número debe estar entre 1 y 999." /> : null}
      {duplicate ? <FormError message={`Ya existe un torneo con el número ${number}.`} /> : null}
      {active ? (
        <Notice tone="danger">
          El Torneo {active.number} sigue activo. La API no deja crear otro hasta terminarlo.
        </Notice>
      ) : null}

      <View className="gap-3">
        <NoirButton
          title="Continuar"
          size="lg"
          disabled={!valid || duplicate}
          onPress={() => router.push({ pathname: '/tournaments/new/configure', params: { number: String(number) } })}
        />
        {active ? (
          <NoirButton
            title={`Ir al Torneo ${active.number}`}
            variant="outline"
            onPress={() => router.push({ pathname: '/tournaments/[id]', params: { id: String(active.id) } })}
          />
        ) : null}
      </View>
    </Screen>
  );
}
