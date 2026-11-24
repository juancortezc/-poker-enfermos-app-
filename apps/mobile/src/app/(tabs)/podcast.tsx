/**
 * Podcast del grupo (web: /podcast → PodcastTab). La web incrusta el
 * reproductor de Spotify en un iframe; en la app se abre Spotify (o el
 * navegador si no está instalada), que además es donde se ven los videos.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Linking, View } from 'react-native';

import { Header } from '@/components/ui/Header';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { Body, Muted, Title } from '@/components/ui/Typography';
import { usePodcast } from '@/hooks/useHomeExtras';
import { useRefresh } from '@/hooks/useRefresh';

const SPOTIFY_GREEN = '#1DB954';
const SPOTIFY_SHOW_ID = '0sZ6ae5UAYUOD45MFa9PcH';

export default function PodcastScreen() {
  const { data, error, isLoading, mutate } = usePodcast();
  const { refreshing, onRefresh } = useRefresh(mutate);

  const webUrl = data?.spotifyUrl ?? `https://open.spotify.com/show/${SPOTIFY_SHOW_ID}`;
  const openSpotify = () =>
    Linking.openURL(`spotify:show:${data?.showId ?? SPOTIFY_SHOW_ID}`).catch(() => Linking.openURL(webUrl).catch(() => {}));

  return (
    <Screen edges={['top']} refreshing={refreshing} onRefresh={onRefresh}>
      <Header overline="Del grupo" title="Podcast" />
      {isLoading && !data ? (
        <LoadingState message="Cargando podcast…" />
      ) : (
        <>
          {error && !data ? <ErrorState error={error} onRetry={() => mutate()} /> : null}
          <NoirCard accent className="gap-4">
            {data?.thumbnailUrl ? (
              <Image
                source={{ uri: data.thumbnailUrl }}
                style={{ width: '100%', aspectRatio: 1, borderRadius: 16 }}
                contentFit="cover"
                transition={200}
                accessibilityLabel={`Portada de ${data.title}`}
              />
            ) : null}
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: SPOTIFY_GREEN }}>
                <Ionicons name="mic" size={22} color="#fff" />
              </View>
              <View className="flex-1">
                <Title className="text-xl">{data?.title || 'Poker de enfermos'}</Title>
                <Muted>Podcast oficial del grupo</Muted>
              </View>
            </View>
            <Body className="text-base text-noir-muted">
              Escuchá nuestro podcast donde hablamos de poker, estrategias y anécdotas del grupo. Los episodios con video se
              ven desde la app de Spotify.
            </Body>
            <NoirButton
              title="Escuchar en Spotify"
              icon={<Ionicons name="headset" size={18} color="#1F1410" />}
              onPress={openSpotify}
            />
          </NoirCard>
        </>
      )}
    </Screen>
  );
}
