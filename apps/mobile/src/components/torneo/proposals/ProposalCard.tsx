/**
 * Tarjeta de propuesta. Equivale a components/proposals/ProposalCard.tsx de
 * la web (acciones de autor y Comisión, etiqueta "Cerrada"). Sin votos ni
 * comentarios: la web tampoco los tiene.
 *
 * Permisos, iguales que la web y la API:
 * - Editar y activar/desactivar: autor o Comisión.
 * - Cerrar/reabrir votación: Comisión, solo en propuestas activas.
 * - Eliminar: Comisión.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CPCard } from '@/components/ui/CPCard';
import { Body, Muted, Overline, Title } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { cp } from '@/theme/colors';
import { useCP } from '@/theme/tone';

import { deleteProposal, formatProposalDate, safeImageUri, setVotingClosed, toggleProposal, type Proposal } from './api';

type Props = {
  proposal: Proposal;
  onEdit?: (proposal: Proposal) => void;
  /** Tras activar, cerrar votación o eliminar. */
  onChanged?: () => void;
};

function Badge({ label, tone, icon }: { label: string; tone: 'muted' | 'primary'; icon?: 'lock-closed' }) {
  const c = useCP();
  const styles = {
    muted: 'border-cp-surface-border bg-cp-surface-2',
    primary: 'border-cp-primary/60 bg-cp-primary/15',
  }[tone];
  const color = tone === 'primary' ? c.primaryLight : c.onSurfaceMuted;
  return (
    <View className={`flex-row items-center gap-1 rounded-full border px-2.5 py-1 ${styles}`}>
      {icon ? <Ionicons name={icon} size={11} color={color} /> : null}
      <Text style={{ color }} className="font-display text-[11px] uppercase tracking-[1.2px]">
        {label}
      </Text>
    </View>
  );
}

function ActionChip({
  label,
  icon,
  onPress,
  busy,
  tone = 'default',
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  busy?: boolean;
  /** info: el color frío de las propuestas (votación); danger: eliminar. */
  tone?: 'default' | 'info' | 'danger';
}) {
  const c = useCP();
  const color = tone === 'info' ? c.info : tone === 'danger' ? c.primaryLight : c.onSurfaceMuted;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      className={`min-h-[44px] flex-row items-center gap-2 rounded-cp border px-4 ${busy ? 'opacity-50' : 'active:opacity-80'}`}
      style={{ borderColor: `${color}80` }}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color }} className="font-inter-bold text-xs uppercase tracking-[0.5px]">
        {busy ? '…' : label}
      </Text>
    </Pressable>
  );
}

export function ProposalCard({ proposal, onEdit, onChanged }: Props) {
  const c = useCP();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<'toggle' | 'voting' | 'delete' | null>(null);
  const [imageOpen, setImageOpen] = useState(false);

  const isComision = user?.role === 'Comision';
  const isAuthor = !!user && !!proposal.createdBy?.id && proposal.createdBy.id === user.id;
  const canEdit = isComision || isAuthor;
  const isActive = proposal.isActive !== false;
  const closed = !!proposal.votingClosed;
  const image = safeImageUri(proposal.imageUrl);

  const run = async (kind: NonNullable<typeof busy>, action: () => Promise<unknown>, failTitle: string) => {
    setBusy(kind);
    try {
      await action();
      onChanged?.();
    } catch (e) {
      Alert.alert(failTitle, e instanceof Error ? e.message : 'Probá de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const confirmVoting = () => {
    const verb = closed ? 'reabrir' : 'cerrar';
    Alert.alert(`¿${closed ? 'Reabrir' : 'Cerrar'} votación?`, `Vas a ${verb} la votación de "${proposal.title}".`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: closed ? 'Reabrir' : 'Cerrar',
        onPress: () => run('voting', () => setVotingClosed(proposal.id, !closed), `No se pudo ${verb} la votación`),
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('¿Eliminar propuesta?', `"${proposal.title}" se borra. No se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => run('delete', () => deleteProposal(proposal.id), 'No se pudo eliminar'),
      },
    ]);
  };

  const showActions = (canEdit && !!onEdit) || isComision;

  return (
    <CPCard raised={isActive && !closed} className={`gap-3 ${isActive ? '' : 'opacity-80'}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint={expanded ? 'Contraer' : 'Ver detalles'}
        onPress={() => setExpanded((v) => !v)}
        className="gap-2">
        <View className="flex-row items-start gap-3">
          <Title className="flex-1 text-xl">{proposal.title}</Title>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={c.onSurfaceVariant} />
        </View>
        <View className="flex-row flex-wrap items-center gap-2">
          {!isActive ? <Badge label="Inactiva" tone="muted" /> : null}
          {closed ? <Badge label="Cerrada" tone="primary" icon="lock-closed" /> : null}
          {proposal.createdBy ? (
            <Muted>
              {proposal.createdBy.firstName} {proposal.createdBy.lastName} · {proposal.createdBy.role}
            </Muted>
          ) : null}
          <Muted>· {formatProposalDate(proposal.createdAt)}</Muted>
        </View>
        {!expanded ? (
          <Body className="text-base text-cp-on-surface-muted" numberOfLines={2}>
            {proposal.objective}
          </Body>
        ) : null}
      </Pressable>

      {expanded ? (
        <View className="gap-4">
          <View className="gap-1">
            <Overline>Objetivo</Overline>
            <Body className="text-base">{proposal.objective}</Body>
          </View>
          <View className="gap-1">
            <Overline>Situación a modificar</Overline>
            <Body className="text-base">{proposal.situation}</Body>
          </View>
          <View className="gap-1">
            <Overline>Propuesta</Overline>
            <Body className="text-base">{proposal.proposal}</Body>
          </View>
          {image ? (
            <Pressable accessibilityRole="imagebutton" accessibilityLabel="Ver imagen completa" onPress={() => setImageOpen(true)}>
              <Image
                source={{ uri: image }}
                style={{ width: '100%', height: 220, borderRadius: 5, backgroundColor: c.surface0 }}
                contentFit="contain"
                transition={200}
              />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showActions ? (
        <View className="flex-row flex-wrap gap-2 border-t border-cp-surface-border pt-3">
          {canEdit && onEdit ? (
            <>
              <ActionChip label="Editar" icon="create-outline" onPress={() => onEdit(proposal)} />
              <ActionChip
                label={isActive ? 'Desactivar' : 'Activar'}
                icon="power"
                busy={busy === 'toggle'}
                onPress={() => run('toggle', () => toggleProposal(proposal.id), 'No se pudo cambiar el estado')}
              />
            </>
          ) : null}
          {isComision && isActive ? (
            <ActionChip
              label={closed ? 'Reabrir votación' : 'Cerrar votación'}
              icon={closed ? 'lock-open-outline' : 'lock-closed-outline'}
              tone="info"
              busy={busy === 'voting'}
              onPress={confirmVoting}
            />
          ) : null}
          {isComision ? (
            <ActionChip label="Eliminar" icon="trash-outline" tone="danger" busy={busy === 'delete'} onPress={confirmDelete} />
          ) : null}
        </View>
      ) : null}

      {image ? (
        <Modal visible={imageOpen} animationType="fade" transparent onRequestClose={() => setImageOpen(false)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar imagen"
              onPress={() => setImageOpen(false)}
              className="min-h-[44px] items-end p-4">
              <Ionicons name="close" size={28} color={cp.onSurface} />
            </Pressable>
            <Image source={{ uri: image }} style={{ flex: 1 }} contentFit="contain" />
          </SafeAreaView>
        </Modal>
      ) : null}
    </CPCard>
  );
}
