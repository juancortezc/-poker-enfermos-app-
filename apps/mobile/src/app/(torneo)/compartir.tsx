/**
 * Compartir al grupo (solo Comisión). Las mismas siete imágenes que /compartir
 * de la web; el PNG lo arma el servidor (/api/share/*, lib/share-image.tsx),
 * así que el grupo recibe exactamente lo mismo venga de la web o de la app.
 * Se piden de a una (como la cola de la web) para no rasterizar siete PNG en
 * paralelo en el servidor.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import useSWR from 'swr';

import { downloadWithAuth, shareFile } from '@/components/torneo/share/share';
import { Header, Muted, NoirButton, NoirCard, RestrictedState, Screen, Title } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { noir } from '@/theme/colors';

type Pieza = {
  clave: 'ultima-fecha' | 'malazo-fecha' | 'lo-que-dejo' | 'podio-torneo' | 'malazos-torneo' | 'elimina' | 'acum';
  titulo: string;
  detalle: string;
  icono: React.ComponentProps<typeof Ionicons>['name'];
  archivo: string;
};

const PIEZAS: Pieza[] = [
  {
    clave: 'ultima-fecha',
    titulo: 'Podio de la noche',
    detalle: 'Los tres primeros de la fecha, con sus fotos, el Varón y cuántos jugaron.',
    icono: 'trophy-outline',
    archivo: 'podio-de-la-noche.png',
  },
  {
    clave: 'malazo-fecha',
    titulo: 'El 7/2 de la noche',
    detalle: 'El primero en salir de la mesa, el segundo y quién lo mandó a casa.',
    icono: 'skull-outline',
    archivo: 'siete-dos-de-la-noche.png',
  },
  {
    clave: 'lo-que-dejo',
    titulo: 'Lo que dejó la noche',
    detalle: 'El Varón, el Malazo, quién más bajó y quién más subió.',
    icono: 'sparkles-outline',
    archivo: 'lo-que-dejo-la-noche.png',
  },
  {
    clave: 'podio-torneo',
    titulo: 'Podio del torneo',
    detalle: 'Los tres primeros de la tabla acumulada, con las mesas finales del líder.',
    icono: 'ribbon-outline',
    archivo: 'podio-del-torneo.png',
  },
  {
    clave: 'malazos-torneo',
    titulo: 'Los 7/2 del torneo',
    detalle: 'Los dos últimos de la tabla y a cuántos puntos están de salir del fondo.',
    icono: 'skull-outline',
    archivo: 'siete-dos-del-torneo.png',
  },
  {
    clave: 'elimina',
    titulo: 'Tabla Elimina',
    detalle: 'La tabla completa del torneo, igual que en la app: PUNTOS, ACUM. y los ELIMINA.',
    icono: 'list-outline',
    archivo: 'tabla-elimina.png',
  },
  {
    clave: 'acum',
    titulo: 'Tabla ACUM.',
    detalle: 'Ordenada por puntos reales, sin descartar fechas. DIF es lo que quita el ELIMINA.',
    icono: 'calculator-outline',
    archivo: 'tabla-acum.png',
  },
];

/** Cola global: una imagen a la vez, igual que `enFila` de la web. */
let cola: Promise<unknown> = Promise.resolve();
function enFila<T>(tarea: () => Promise<T>): Promise<T> {
  const turno = cola.then(tarea, tarea);
  cola = turno.catch(() => undefined);
  return turno;
}

type Aspecto = { width: number; height: number };

function Tarjeta({ pieza }: { pieza: Pieza }) {
  // SWR maneja carga, error y "regenerar" (mutate). Sin revalidar al volver a
  // la app: cada imagen cuesta un render en el servidor.
  const { data: uri, error, isValidating, mutate } = useSWR(
    `share-image:${pieza.clave}`,
    // Nombre con marca de tiempo: expo-image cachea por URI.
    () => enFila(() => downloadWithAuth(`/api/share/${pieza.clave}`, `${Date.now()}-${pieza.archivo}`)).then((f) => f.uri),
    { revalidateOnFocus: false, revalidateOnReconnect: false, revalidateIfStale: false, shouldRetryOnError: false }
  );
  const [aspecto, setAspecto] = useState<Aspecto>({ width: 1080, height: 1350 });
  const cargando = isValidating;
  const mensajeError = error
    ? error instanceof ApiError && error.status === 404
      ? 'Todavía no hay datos para esta imagen.'
      : 'No se pudo generar la imagen.'
    : null;
  const estado = uri && !cargando ? { uri } : null;
  const generar = () => mutate();

  const compartir = async () => {
    if (!estado) return;
    try {
      await shareFile(estado.uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: pieza.titulo });
    } catch (e) {
      Alert.alert('No se pudo compartir', e instanceof Error ? e.message : 'Probá de nuevo.');
    }
  };

  return (
    <NoirCard className="gap-3">
      <View className="flex-row items-start gap-3">
        <Ionicons name={pieza.icono} size={22} color={noir.gold} />
        <View className="flex-1 gap-0.5">
          <Title className="text-lg">{pieza.titulo}</Title>
          <Muted>{pieza.detalle}</Muted>
        </View>
      </View>

      <View className="min-h-[140px] items-center justify-center overflow-hidden rounded-xl border border-noir-border bg-noir-bg">
        {cargando ? (
          <View className="items-center gap-2 p-6">
            <ActivityIndicator color={noir.gold} />
            <Muted>Generando…</Muted>
          </View>
        ) : mensajeError ? (
          <Text className="p-6 text-center font-inter text-sm text-noir-danger">{mensajeError}</Text>
        ) : estado ? (
          <Image
            source={{ uri: estado.uri }}
            style={{ width: '100%', aspectRatio: aspecto.width / aspecto.height }}
            contentFit="contain"
            onLoad={(e) => setAspecto({ width: e.source.width, height: e.source.height })}
            accessibilityLabel={`Vista previa de ${pieza.titulo}`}
          />
        ) : null}
      </View>

      <View className="flex-row gap-2">
        <NoirButton
          title="Compartir"
          className="flex-1"
          disabled={!estado || cargando}
          onPress={compartir}
          icon={<Ionicons name="share-social-outline" size={18} color={noir.bg} />}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Regenerar ${pieza.titulo}`}
          disabled={cargando}
          onPress={generar}
          className={`h-12 w-12 items-center justify-center rounded-full border border-noir-border ${cargando ? 'opacity-50' : 'active:opacity-80'}`}>
          <Ionicons name="refresh" size={20} color={noir.muted} />
        </Pressable>
      </View>
    </NoirCard>
  );
}

export default function CompartirScreen() {
  // Mismo permiso que la entrada en Más: solo Comisión.
  const { can } = useAuth();

  return (
    <>
      <Stack.Screen options={{ title: 'Compartir' }} />
      {!can('tournaments') ? (
        <Screen scroll={false}>
          <RestrictedState message="Compartir al grupo es solo para la Comisión." />
        </Screen>
      ) : (
        <Screen>
          <Header
            overline="Comisión"
            title="Compartir al grupo"
            subtitle="Imágenes listas para WhatsApp. Solo información del grupo: nada de resultados personales."
          />
          {PIEZAS.map((pieza) => (
            <Tarjeta key={pieza.clave} pieza={pieza} />
          ))}
        </Screen>
      )}
    </>
  );
}
