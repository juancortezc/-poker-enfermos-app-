/**
 * Propuestas del próximo torneo. Junta en una pantalla lo que en la web son
 * /propuestas-v2 (mis propuestas) y la antigua vista pública /t29:
 *
 * - Todas: propuestas activas, con votos y comentarios (todos los roles).
 * - Mías: crear, editar, activar/desactivar (permiso `my-proposals`).
 * - Comisión: todas, incluidas las inactivas; cerrar/reabrir votación y
 *   eliminar (permiso `proposals-admin`).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, View } from 'react-native';
import useSWR, { useSWRConfig } from 'swr';

import { ChipTabs } from '@/components/torneo/ChipTabs';
import { ProposalCard } from '@/components/torneo/proposals/ProposalCard';
import { ProposalForm } from '@/components/torneo/proposals/ProposalForm';
import { proposalKeys, type Proposal, type ProposalsResponse } from '@/components/torneo/proposals/api';
import { EmptyState, ErrorState, Header, LoadingState, Muted, NoirButton, Screen } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { noir } from '@/theme/colors';

type View_ = 'publicas' | 'mias' | 'comision';

const KEY_BY_VIEW: Record<View_, string> = {
  publicas: proposalKeys.public,
  mias: proposalKeys.my,
  comision: proposalKeys.admin,
};

export default function PropuestasV2Screen() {
  const { can } = useAuth();
  const { mutate: globalMutate } = useSWRConfig();
  const [view, setView] = useState<View_>('publicas');
  const [editing, setEditing] = useState<Proposal | null>(null);
  const [creating, setCreating] = useState(false);

  const tabs = [
    { id: 'publicas' as const, label: 'Todas' },
    ...(can('my-proposals') ? [{ id: 'mias' as const, label: 'Mías' }] : []),
    ...(can('proposals-admin') ? [{ id: 'comision' as const, label: 'Comisión' }] : []),
  ];

  const key = KEY_BY_VIEW[view];
  const { data, error, isLoading, mutate, isValidating } = useSWR<ProposalsResponse>(key);
  const proposals = data?.proposals ?? [];

  /** Un cambio en una lista afecta a las otras dos (activa/inactiva, cerrada). */
  const refreshAll = () => {
    Object.values(KEY_BY_VIEW).forEach((k) => globalMutate(k));
  };

  const closeForm = () => {
    setCreating(false);
    setEditing(null);
  };

  const onSaved = () => {
    closeForm();
    refreshAll();
  };

  const canManage = view !== 'publicas';
  const formOpen = creating || !!editing;

  return (
    <>
      <Stack.Screen options={{ title: 'Propuestas' }} />
      <Screen refreshing={isValidating && !isLoading} onRefresh={() => mutate()}>
        <Header
          overline="Torneo"
          title="Propuestas"
          subtitle={
            view === 'mias'
              ? `${proposals.length} propuesta${proposals.length === 1 ? '' : 's'} tuya${proposals.length === 1 ? '' : 's'}`
              : 'Votá y comentá las ideas para el próximo torneo'
          }
        />

        {tabs.length > 1 ? (
          <ChipTabs
            tabs={tabs}
            value={view}
            onChange={(next) => {
              closeForm();
              setView(next);
            }}
          />
        ) : null}

        {view === 'mias' ? (
          <NoirButton
            title="Nueva propuesta"
            onPress={() => setCreating(true)}
            icon={<Ionicons name="add" size={20} color={noir.bg} />}
          />
        ) : null}


        {isLoading ? <LoadingState message="Cargando propuestas…" /> : null}
        {error && !data ? <ErrorState error={error} onRetry={() => mutate()} /> : null}

        {!isLoading && data && proposals.length === 0 ? (
          view === 'mias' ? (
            <EmptyState
              icon="bulb-outline"
              message="Todavía no creaste ninguna propuesta."
              actionTitle="Crear la primera"
              onAction={() => setCreating(true)}
            />
          ) : (
            <EmptyState icon="bulb-outline" message="No hay propuestas activas por ahora." />
          )
        ) : null}

        {proposals.map((p) => (
          <ProposalCard
            key={p.id}
            proposal={p}
            interactive={view === 'publicas'}
            onEdit={
              canManage
                ? (proposal) => {
                    setCreating(false);
                    setEditing(proposal);
                  }
                : undefined
            }
            onChanged={refreshAll}
          />
        ))}

        {view === 'mias' ? (
          <View className="gap-1 pt-2">
            <Muted>• Podés editar y desactivar tus propias propuestas.</Muted>
            <Muted>• Las activas aparecen en «Todas» para que el grupo vote.</Muted>
            <Muted>• La Comisión revisa y cierra la votación de cada una.</Muted>
          </View>
        ) : null}
      </Screen>

      <Modal visible={formOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeForm}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Screen edges={['top', 'bottom']}>
            {formOpen ? (
              <ProposalForm key={editing?.id ?? 'new'} initial={editing} onSaved={onSaved} onCancel={closeForm} />
            ) : null}
          </Screen>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
