/**
 * Estados de carga, error, vacio y restringido, en Clean Poker:
 * spinner rojo, error en rojo-texto, vacio con icono frio (informativo).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, View } from 'react-native';

import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Body, Muted } from '@/components/ui/Typography';
import { ApiError } from '@/lib/api';
import { useCP } from '@/theme/tone';

export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  const c = useCP();
  return (
    <CPCard className="items-center gap-3 py-10">
      <ActivityIndicator size="large" color={c.primary} />
      <Muted>{message}</Muted>
    </CPCard>
  );
}

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'No tenés permiso para ver esto.';
    if (error.status === 404) return 'No encontramos lo que buscabas.';
    if (error.status >= 500) return 'El servidor tuvo un problema. Probá en un rato.';
    return error.message;
  }
  if (error instanceof Error && /network|fetch/i.test(error.message)) {
    return 'Sin conexión. Revisá tu internet.';
  }
  return 'Algo salió mal.';
}

export function ErrorState({
  error,
  message,
  onRetry,
}: {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
}) {
  const c = useCP();
  return (
    <CPCard className="items-center gap-3 border-cp-primary/40 py-8">
      <Ionicons name="alert-circle-outline" size={36} color={c.primaryLight} />
      <Body className="text-center">{message ?? describeError(error)}</Body>
      {onRetry ? <CPButton title="Reintentar" variant="outline" onPress={onRetry} /> : null}
    </CPCard>
  );
}

export function EmptyState({
  message,
  icon = 'leaf-outline',
  actionTitle,
  onAction,
}: {
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  actionTitle?: string;
  onAction?: () => void;
}) {
  const c = useCP();
  return (
    <CPCard className="items-center gap-3 py-8">
      <Ionicons name={icon} size={36} color={c.info} />
      <Muted className="text-center">{message}</Muted>
      {actionTitle && onAction ? <CPButton title={actionTitle} onPress={onAction} /> : null}
    </CPCard>
  );
}

/** Aviso de funcion restringida por rol (candado). */
export function RestrictedState({ message }: { message: string }) {
  const c = useCP();
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6">
      <Ionicons name="lock-closed-outline" size={40} color={c.onSurfaceVariant} />
      <Body className="text-center">{message}</Body>
    </View>
  );
}
