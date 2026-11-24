/**
 * Estados de carga, error y vacío (CLAUDE.md > State Patterns), en Noir Jazz.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, View } from 'react-native';

import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Body, Muted } from '@/components/ui/Typography';
import { ApiError } from '@/lib/api';
import { noir } from '@/theme/colors';

export function LoadingState({ message = 'Cargando…' }: { message?: string }) {
  return (
    <NoirCard className="items-center gap-3 py-10">
      <ActivityIndicator size="large" color={noir.gold} />
      <Muted>{message}</Muted>
    </NoirCard>
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
  return (
    <NoirCard className="items-center gap-3 border-noir-copper/60 py-8">
      <Ionicons name="alert-circle-outline" size={36} color={noir.danger} />
      <Body className="text-center">{message ?? describeError(error)}</Body>
      {onRetry ? <NoirButton title="Reintentar" variant="outline" onPress={onRetry} /> : null}
    </NoirCard>
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
  return (
    <NoirCard className="items-center gap-3 py-8">
      <Ionicons name={icon} size={36} color={noir.gold} />
      <Muted className="text-center">{message}</Muted>
      {actionTitle && onAction ? <NoirButton title={actionTitle} onPress={onAction} /> : null}
    </NoirCard>
  );
}

/** Aviso de función restringida por rol (candado). */
export function RestrictedState({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 px-6">
      <Ionicons name="lock-closed-outline" size={40} color={noir.gold} />
      <Body className="text-center">{message}</Body>
    </View>
  );
}
