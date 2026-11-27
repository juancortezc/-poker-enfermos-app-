/**
 * Pestañas del panel que enlazan o reutilizan pantallas existentes:
 * Torneo (crear y administrar), Blinds del torneo activo, Enfermos
 * (directorio, altas, importación) y Premios (los de Estadísticas).
 */
import { type BlindLevel } from '@poker/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import useSWR from 'swr';

import type { ActiveGameDate } from '@/hooks/useActiveGameDate';
import { Segmented } from '@/components/jugador/Segmented';
import { ParentChildTab } from '@/components/torneo/stats/ParentChildTab';
import { PremiosTab as StatsPremios } from '@/components/torneo/stats/PremiosTab';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';
import { Muted, Overline, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import type { ActiveTournament } from '@/hooks/useActiveTournament';
import { apiFetch } from '@/lib/api';
import { swrKeys } from '@/lib/swr';

import { confirmAction, errorMessage, useAdminRefresh, useTournament } from '../api';
import { BlindLevelsEditor } from '../BlindLevelsEditor';
import { FormError, LinkRow, Notice } from '../Form';

export function TorneoTab({ tournament }: { tournament: ActiveTournament | undefined }) {
  return (
    <View className="gap-3">
      {tournament ? (
        <CPCard className="gap-2">
          <Overline>Torneo activo</Overline>
          <Title>Torneo {tournament.number}</Title>
          <Muted>
            {tournament.totalDates} fechas · {tournament.participantIds.length} jugadores
          </Muted>
          <CPButton
            title="Editar torneo"
            onPress={() => router.push({ pathname: '/tournaments/[id]/edit', params: { id: String(tournament.id) } })}
          />
          <CPButton
            title="Administrar torneo"
            variant="outline"
            onPress={() => router.push({ pathname: '/tournaments/[id]', params: { id: String(tournament.id) } })}
          />
        </CPCard>
      ) : (
        <EmptyState icon="trophy-outline" message="No hay torneo activo." actionTitle="Crear torneo" onAction={() => router.push('/tournaments/new')} />
      )}
      <LinkRow icon="add-circle-outline" title="Nuevo torneo" subtitle="Número, jugadores, calendario y blinds" onPress={() => router.push('/tournaments/new')} />
      <LinkRow icon="trophy-outline" title="Todos los torneos" subtitle="Activos y finalizados" onPress={() => router.push('/tournaments')} />
    </View>
  );
}

export function BlindsTab({ tournamentId }: { tournamentId: number | undefined }) {
  const t = useTournament(tournamentId ?? null);
  if (!tournamentId) return <EmptyState icon="layers-outline" message="No hay torneo activo." />;
  if (t.isLoading && !t.data) return <LoadingState />;
  if (t.error || !t.data) return <ErrorState error={t.error} onRetry={() => t.mutate()} />;
  return <BlindsEditorCard key={t.data.id} tournamentId={t.data.id} number={t.data.number} initial={t.data.blindLevels} onSaved={() => t.mutate()} />;
}

function BlindsEditorCard({
  tournamentId,
  number,
  initial,
  onSaved,
}: {
  tournamentId: number;
  number: number;
  initial: BlindLevel[];
  onSaved: () => void;
}) {
  const refresh = useAdminRefresh();
  const live = useSWR<ActiveGameDate | null>(swrKeys.activeGameDate());
  const [levels, setLevels] = useState<BlindLevel[]>(() =>
    initial.map(({ level, smallBlind, bigBlind, duration }) => ({ level, smallBlind, bigBlind, duration }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inProgress = live.data?.status === 'in_progress';
  const dirty = JSON.stringify(levels) !== JSON.stringify(initial.map(({ level, smallBlind, bigBlind, duration }) => ({ level, smallBlind, bigBlind, duration })));

  const save = async () => {
    if (inProgress) {
      const ok = await confirmAction(
        'Fecha en curso',
        'El timer lee los blinds en cada consulta: el cambio se aplica ya en la mesa.',
        'Guardar igual'
      );
      if (!ok) return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await apiFetch(`/api/tournaments/${tournamentId}`, { method: 'PUT', json: { blindLevels: levels } });
      refresh.tournaments(tournamentId);
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(errorMessage(e, 'Error al guardar los blinds'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="gap-3">
      <Overline>Blinds del Torneo {number}</Overline>
      {inProgress ? <Notice>Hay una fecha en curso: lo que guardes cambia el timer al instante.</Notice> : null}
      <CPCard className="p-4">
        <BlindLevelsEditor levels={levels} onChange={(l) => (setLevels(l), setSaved(false))} />
      </CPCard>
      <FormError message={error} />
      {saved ? <Notice tone="ok">Blinds guardados.</Notice> : null}
      <CPButton title="Guardar blinds" size="lg" loading={saving} disabled={!dirty} onPress={save} />
    </View>
  );
}

export function EnfermosTab() {
  return (
    <View className="gap-3">
      <LinkRow icon="people-outline" title="Directorio" subtitle="Enfermos e invitados, con edición" onPress={() => router.push('/players')} />
      <LinkRow icon="person-add-outline" title="Nuevo Enfermo" subtitle="Con clave, rol y foto" onPress={() => router.push('/players/new')} />
      <LinkRow
        icon="happy-outline"
        title="Nuevo invitado"
        subtitle="Con el Enfermo que lo invita"
        onPress={() => router.push({ pathname: '/players/new', params: { type: 'invitado' } })}
      />
      <LinkRow icon="cloud-upload-outline" title="Importar CSV" subtitle="Resultados históricos de una fecha" onPress={() => router.push('/importar')} />
    </View>
  );
}

export function PremiacionTab() {
  const { can } = useAuth();
  const [sub, setSub] = useState<'premios' | 'ph'>('premios');
  return (
    <View className="gap-4">
      {can('stats-parents') ? (
        <Segmented
          options={[
            { id: 'premios', label: 'Premios' },
            { id: 'ph', label: 'P&H' },
          ]}
          value={sub}
          onChange={setSub}
        />
      ) : null}
      {sub === 'ph' && can('stats-parents') ? <ParentChildTab /> : <StatsPremios />}
    </View>
  );
}
