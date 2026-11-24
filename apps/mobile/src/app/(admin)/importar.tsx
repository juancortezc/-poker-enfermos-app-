/**
 * Importar resultados históricos desde CSV, contra los endpoints que ya usa
 * la web (/api/admin/import/validate y /execute): elegir el archivo, ver la
 * validación (jugadores reconocidos, errores y avisos, las filas) y confirmar.
 *
 * La importación reemplaza las eliminaciones que tenga esa fecha y la marca
 * como completada, así que se confirma dos veces y solo con el CSV válido.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSWRConfig } from 'swr';

import { confirmAction, errorMessage } from '@/components/admin/api';
import { FormError, Notice } from '@/components/admin/Form';
import { Header } from '@/components/ui/Header';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { Muted, Overline } from '@/components/ui/Typography';
import { apiFetch } from '@/lib/api';
import { noir } from '@/theme/colors';

const MAX_BYTES = 5 * 1024 * 1024;

interface CsvElimination {
  torneo: string;
  fecha: number;
  date: string;
  posicion: number;
  eliminado: string;
  eliminador: string;
  puntos: number;
}

interface ValidateResponse {
  valid: boolean;
  errors: string[];
  warnings: string[];
  playerValidation: {
    valid: { csvName: string; dbName: string; playerId: string; role: string }[];
    invalid: { csvName: string; reason: string }[];
    warnings: { csvName: string; message: string }[];
  };
  eliminations: CsvElimination[];
  previewData: {
    totalRecords: number;
    playerCount: number;
    tournamentInfo: { tournament: string; date: string; dateNumber: number };
  };
}

interface ExecuteResponse {
  message: string;
  imported: number;
  tournamentNumber: number;
  dateNumber: number;
}

type Picked = { name: string; uri: string; size?: number; mimeType?: string };

export default function ImportScreen() {
  const { mutate } = useSWRConfig();
  const [file, setFile] = useState<Picked | null>(null);
  const [preview, setPreview] = useState<ValidateResponse | null>(null);
  const [result, setResult] = useState<ExecuteResponse | null>(null);
  const [busy, setBusy] = useState<'validate' | 'execute' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setSuggestions([]);
  };

  const pick = async () => {
    reset();
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const picked: Picked = { name: asset.name, uri: asset.uri, size: asset.size, mimeType: asset.mimeType };
    if (!picked.name.toLowerCase().endsWith('.csv')) {
      setError('Elegí un archivo .csv');
      return;
    }
    if (picked.size && picked.size > MAX_BYTES) {
      setError('Archivo demasiado grande (máximo 5 MB).');
      return;
    }
    setFile(picked);
    await validate(picked);
  };

  const validate = async (f: Picked) => {
    setBusy('validate');
    setError(null);
    try {
      const form = new FormData();
      // React Native sube el archivo desde su uri con este objeto.
      form.append('file', { uri: f.uri, name: f.name, type: f.mimeType ?? 'text/csv' } as unknown as Blob);
      const data = await apiFetch<ValidateResponse>('/api/admin/import/validate', { method: 'POST', body: form });
      setPreview(data);
    } catch (e) {
      setError(errorMessage(e, 'No se pudo validar el archivo'));
    } finally {
      setBusy(null);
    }
  };

  const execute = async () => {
    if (!preview?.valid) return;
    const info = preview.previewData.tournamentInfo;
    const first = await confirmAction(
      'Importar resultados',
      `${preview.previewData.totalRecords} eliminaciones en ${info.tournament}, fecha ${info.dateNumber}.`,
      'Continuar',
      false
    );
    if (!first) return;
    const second = await confirmAction(
      'Confirmar importación',
      'Si esa fecha ya tiene eliminaciones se borran y se reemplazan, y la fecha queda completada. No se puede deshacer.',
      'Importar'
    );
    if (!second) return;
    setBusy('execute');
    setError(null);
    setSuggestions([]);
    try {
      const r = await apiFetch<ExecuteResponse>('/api/admin/import/execute', {
        method: 'POST',
        json: { eliminations: preview.eliminations },
      });
      setResult(r);
      mutate((key) => typeof key === 'string' && (key.startsWith('/api/tournaments') || key.startsWith('/api/game-dates') || key.startsWith('/api/eliminations')));
    } catch (e) {
      setError(errorMessage(e, 'Error durante la importación'));
      try {
        const info = (e as { info?: string }).info;
        const parsed = info ? (JSON.parse(info) as { suggestions?: string[] }) : null;
        setSuggestions(parsed?.suggestions ?? []);
      } catch {
        setSuggestions([]);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Importar CSV' }} />
      <Header overline="Comisión" title="Importar resultados" subtitle="Una fecha por archivo, con sus eliminaciones." />

      {!file ? (
        <NoirCard className="gap-3 p-4">
          <Overline>Formato</Overline>
          <Text className="font-inter text-xs leading-5 text-noir-muted" selectable>
            torneo,fecha,date,posicion,eliminado,eliminador,puntos{'\n'}Torneo 28,1,2025-01-14,19,Juan Pérez,Diego Ruiz,1
          </Text>
          <Muted className="text-xs">Una fila por jugador, posiciones de 1 a N, fecha AAAA-MM-DD, puntos de 0 a 30. El ganador va sin eliminador.</Muted>
        </NoirCard>
      ) : (
        <NoirCard className="flex-row items-center gap-3 p-4">
          <Ionicons name="document-text-outline" size={28} color={noir.gold} />
          <View className="flex-1">
            <Text numberOfLines={1} className="font-inter-semibold text-base text-noir-text">
              {file.name}
            </Text>
            {file.size ? <Muted className="text-xs">{(file.size / 1024).toFixed(1)} KB</Muted> : null}
          </View>
        </NoirCard>
      )}

      <NoirButton
        title={file ? 'Elegir otro archivo' : 'Elegir archivo CSV'}
        variant={file ? 'outline' : 'primary'}
        size="lg"
        loading={busy === 'validate'}
        disabled={!!busy}
        onPress={pick}
      />

      <FormError message={error} />
      {suggestions.map((s) => (
        <Muted key={s} className="text-xs">
          • {s}
        </Muted>
      ))}

      {result ? (
        <Notice tone="ok">
          {result.message}. Torneo {result.tournamentNumber}, fecha {result.dateNumber} completada.
        </Notice>
      ) : null}

      {preview && !result ? <Preview data={preview} /> : null}

      {preview && !result ? (
        preview.valid ? (
          <NoirButton title="Importar" size="lg" variant="copper" loading={busy === 'execute'} disabled={!!busy} onPress={execute} />
        ) : (
          <Notice tone="danger">Corregí los errores del archivo y volvé a elegirlo.</Notice>
        )
      ) : null}
      {result ? <NoirButton title="Importar otro" variant="outline" onPress={reset} /> : null}
    </Screen>
  );
}

function Preview({ data }: { data: ValidateResponse }) {
  const info = data.previewData.tournamentInfo;
  const rows = [...data.eliminations].sort((a, b) => a.posicion - b.posicion);
  return (
    <>
      <NoirCard accent className="gap-2 p-4">
        <Overline>{data.valid ? 'Listo para importar' : 'Con errores'}</Overline>
        <Text className="font-cinzel-bold text-lg text-noir-text">
          {info.tournament} · Fecha {info.dateNumber}
        </Text>
        <Muted>
          {info.date} · {data.previewData.totalRecords} filas · {data.previewData.playerCount} jugadores
        </Muted>
      </NoirCard>

      {data.errors.length > 0 ? (
        <NoirCard className="gap-1 border-noir-danger/50 p-4">
          <Overline className="text-noir-danger">Errores ({data.errors.length})</Overline>
          {data.errors.map((e) => (
            <Text key={e} className="font-inter text-sm text-noir-danger">
              • {e}
            </Text>
          ))}
        </NoirCard>
      ) : null}

      {data.warnings.length + data.playerValidation.warnings.length > 0 ? (
        <NoirCard className="gap-1 p-4">
          <Overline>Avisos</Overline>
          {data.warnings.map((w) => (
            <Text key={w} className="font-inter text-sm text-noir-gold">
              • {w}
            </Text>
          ))}
          {data.playerValidation.warnings.map((w) => (
            <Text key={w.csvName + w.message} className="font-inter text-sm text-noir-gold">
              • {w.csvName}: {w.message}
            </Text>
          ))}
        </NoirCard>
      ) : null}

      {data.playerValidation.valid.some((v) => v.csvName !== v.dbName) ? (
        <NoirCard className="gap-1 p-4">
          <Overline>Nombres reconocidos</Overline>
          {data.playerValidation.valid
            .filter((v) => v.csvName !== v.dbName)
            .map((v) => (
              <Muted key={v.csvName}>
                {v.csvName} → {v.dbName}
              </Muted>
            ))}
        </NoirCard>
      ) : null}

      <NoirCard className="gap-0 p-4">
        <Overline className="pb-2">Filas</Overline>
        {rows.slice(0, 40).map((r) => (
          <View key={`${r.posicion}-${r.eliminado}`} className="flex-row items-center gap-2 border-b border-noir-border py-1.5">
            <Text className="w-7 text-right font-cinzel-bold text-sm text-noir-gold">{r.posicion}</Text>
            <View className="flex-1">
              <Text numberOfLines={1} className="font-inter text-sm text-noir-text">
                {r.eliminado}
              </Text>
              {r.eliminador ? (
                <Text numberOfLines={1} className="font-inter text-[11px] text-noir-muted">
                  por {r.eliminador}
                </Text>
              ) : null}
            </View>
            <Text className="font-inter-bold text-sm text-noir-text">{r.puntos}</Text>
          </View>
        ))}
        {rows.length > 40 ? <Muted className="pt-2 text-xs">… y {rows.length - 40} filas más.</Muted> : null}
      </NoirCard>
    </>
  );
}
