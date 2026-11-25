/**
 * Reportes (solo Comisión). Igual que /reportes de la web: elige un torneo y
 * baja el Excel de /api/stats/tournament-report/[id]. En el teléfono no hay
 * "descargas": el archivo va a la caché y se abre el menú de compartir
 * (guardar en Archivos, mandar por WhatsApp, abrir en Excel…).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { OptionPicker } from '@/components/torneo/OptionPicker';
import { downloadWithAuth, shareFile } from '@/components/torneo/share/share';
import { useTournamentOptions } from '@/components/torneo/stats/useTournamentOptions';
import { Body, Header, Muted, CPButton, CPCard, Overline, RestrictedState, Screen } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { cp } from '@/theme/colors';

const INCLUYE = [
  'Resultados por fecha jugada: posición, eliminado por, puntos.',
  'Matriz de eliminaciones: quién eliminó a quién y cuántas veces.',
  'Premiación final: Varón del Torneo, Podio Final, 7/2 Final, Padres e Hijos.',
  'Días sin ganar: última victoria de cada jugador, con la fecha de referencia usada para el cálculo.',
];

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function ReportesScreen() {
  // Mismo permiso que la entrada en Más: solo Comisión.
  const { can } = useAuth();
  const t = useTournamentOptions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!can('tournaments')) {
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
          subtitle="El reporte completo de un torneo en Excel, listo para guardar o compartir."
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

        <CPCard className="gap-2">
          <Overline>Qué incluye el reporte</Overline>
          {INCLUYE.map((line) => (
            <Muted key={line}>· {line}</Muted>
          ))}
        </CPCard>
      </Screen>
    </>
  );
}
