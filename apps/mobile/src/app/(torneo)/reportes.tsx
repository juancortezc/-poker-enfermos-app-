/**
 * Reportes (solo Comisión). Igual que /reportes de la web: elige un torneo,
 * muestra el Resumen (los mismos números de la hoja Resumen del Excel) y baja
 * el Excel de /api/stats/tournament-report/[id]. En el teléfono no hay
 * "descargas": el archivo va a la caché y se abre el menú de compartir
 * (guardar en Archivos, mandar por WhatsApp, abrir en Excel…).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { REPORT_SHEETS, type TournamentReportSummaryResponse } from '@poker/shared';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import useSWR from 'swr';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { downloadWithAuth, shareFile } from '@/components/torneo/share/share';
import { useTournamentOptions } from '@/components/torneo/stats/useTournamentOptions';
import {
  Body,
  CPButton,
  CPCard,
  ErrorState,
  Header,
  Muted,
  Overline,
  RestrictedState,
  Screen,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { cp } from '@/theme/colors';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function ReportesScreen() {
  // Mismo permiso que la entrada en Más: solo Comisión.
  const { can } = useAuth();
  const allowed = can('tournaments');
  const t = useTournamentOptions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summary = useSWR<TournamentReportSummaryResponse>(
    allowed && t.selected ? `/api/stats/tournament-report/${t.selected.id}/summary` : null
  );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: 'Reportes' }} />
        <Screen tone="light" scroll={false}>
          <RestrictedState message="Los reportes son solo para la Comisión." />
        </Screen>
      </>
    );
  }

  const download = async () => {
    if (!t.selected) return;
    setBusy(true);
    setError(null);
    try {
      const file = await downloadWithAuth(
        `/api/stats/tournament-report/${t.selected.id}`,
        `torneo-${t.selected.number}-reporte.xlsx`
      );
      await shareFile(file.uri, {
        mimeType: XLSX_MIME,
        UTI: 'org.openxmlformats.spreadsheetml.sheet',
        dialogTitle: `Reporte Torneo ${t.selected.number}`,
      });
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 404
          ? 'No encontramos ese torneo.'
          : 'No se pudo generar el reporte. Intentá de nuevo.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Reportes' }} />
      <Screen tone="light">
        <Header
          overline="Comisión"
          title="Reportes"
          subtitle="El reporte de fin de torneo en Excel, listo para armar la presentación."
        />

        <View className="gap-2">
          <Overline>Torneo</Overline>
          <View className="flex-row">
            <OptionPicker
              label="Torneo"
              value={t.selectedId}
              options={t.options}
              onChange={t.setSelectedId}
              placeholder={t.isLoading ? 'Cargando…' : 'Elegí un torneo'}
            />
          </View>
        </View>

        <CPButton
          title={busy ? 'Generando…' : 'Descargar XLSX'}
          size="lg"
          loading={busy}
          disabled={!t.selected}
          onPress={download}
          icon={<Ionicons name="download-outline" size={20} color={cp.onPrimary} />}
        />

        {error ? (
          <CPCard className="border-cp-primary/60">
            <Body className="text-base text-cp-primary-light">{error}</Body>
          </CPCard>
        ) : null}

        {summary.error ? (
          <ErrorState error={summary.error} onRetry={() => summary.mutate()} />
        ) : (
          <CPCard className="gap-1">
            <Overline>Resumen del torneo</Overline>
            {!summary.data ? (
              <Muted>{t.selected ? 'Calculando…' : 'Elegí un torneo para ver el resumen.'}</Muted>
            ) : (
              summary.data.rows.map((row, i) => (
                <View
                  key={row.label}
                  className={`py-2 ${i === 0 ? '' : 'border-t border-cp-surface-border'}`}
                  accessible
                  accessibilityLabel={`${row.label}: ${row.fillIn ? 'por completar' : row.value ?? 'sin dato'}${row.detail && !row.fillIn ? `. ${row.detail}` : ''}`}
                >
                  <View className="flex-row items-baseline justify-between gap-3">
                    <Text className="flex-1 font-inter text-sm text-cp-on-surface-variant">{row.label}</Text>
                    <Text
                      className={`font-display text-[15px] ${row.fillIn ? 'text-cp-on-surface-muted' : 'text-cp-on-surface'}`}
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {row.fillIn ? 'Completar' : String(row.value ?? '—')}
                    </Text>
                  </View>
                  {row.detail && !row.fillIn ? <Text className="font-inter text-xs leading-snug text-cp-on-surface-muted">{row.detail}</Text> : null}
                </View>
              ))
            )}
          </CPCard>
        )}

        <CPCard className="gap-2">
          <Overline>{`Qué trae el Excel · ${REPORT_SHEETS.length} hojas`}</Overline>
          {REPORT_SHEETS.map((sheet, i) => (
            <View key={sheet.name} className="flex-row gap-2">
              <Text className="w-5 font-display text-sm text-cp-primary-light">{i + 1}</Text>
              <Text className="flex-1 font-inter text-sm leading-relaxed text-cp-on-surface-muted">
                <Text className="font-inter-semibold text-cp-on-surface">{sheet.name}. </Text>
                {sheet.description}
              </Text>
            </View>
          ))}
        </CPCard>
      </Screen>
    </>
  );
}
