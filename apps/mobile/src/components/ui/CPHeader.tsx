/**
 * Barra de arriba de las pestañas: CPHeader de la web.
 * Logo a la izquierda; al centro "TORNEO" en rojo con su filete y el numero,
 * con el numero gigante y tenue detras; a la derecha Registro (Comision con
 * fecha activa), Administracion (Comision) y el perfil.
 */
import logo from '@/assets/icons/logo.png';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveGameDate } from '@/hooks/useActiveGameDate';
import { useActiveTournament } from '@/hooks/useActiveTournament';
import { fonts } from '@/theme/colors';
import { useCP, useTone } from '@/theme/tone';

function RoundButton({
  label,
  onPress,
  children,
  bg,
  border,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  bg: string;
  border: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={{ backgroundColor: bg, borderColor: border }}
      className="h-10 w-10 items-center justify-center rounded-full border active:opacity-70">
      {children}
    </Pressable>
  );
}

export function CPHeader() {
  const c = useCP();
  const light = useTone() === 'light';
  const { user, can } = useAuth();
  const { tournament } = useActiveTournament();
  const { hasActiveGameDate } = useActiveGameDate();
  const number = tournament?.number;
  const isComision = can('tournaments');

  return (
    <View
      className="h-[60px] flex-row items-center justify-center overflow-hidden border-b border-cp-surface-border px-4"
      style={{ backgroundColor: light ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.04)' }}>
      {number ? (
        <Text
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            position: 'absolute',
            right: -4,
            top: -12,
            fontFamily: fonts.displayBlack,
            fontSize: 80,
            lineHeight: 84,
            letterSpacing: -3,
            color: light ? 'rgba(23,18,15,0.045)' : 'rgba(220,40,60,0.065)',
          }}>
          {number}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Inicio"
        onPress={() => router.navigate('/home')}
        className="absolute left-4">
        <Image source={logo} style={{ width: 40, height: 40, borderRadius: 20 }} contentFit="contain" />
      </Pressable>

      <View className="items-center" style={{ gap: 3 }}>
        <View className="flex-row items-baseline" style={{ gap: 6 }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 13, letterSpacing: 2.4, color: c.primaryLight }}>TORNEO</Text>
          {number ? (
            <Text style={{ fontFamily: fonts.displayBlack, fontSize: 22, lineHeight: 24, color: c.onSurface }}>
              {number}
            </Text>
          ) : null}
        </View>
        <View style={{ height: 2, width: 32, backgroundColor: c.primary, opacity: 0.8, borderRadius: 1 }} />
      </View>

      <View className="absolute right-4 flex-row items-center" style={{ gap: 8 }}>
        {isComision && hasActiveGameDate ? (
          <RoundButton
            label="Registro"
            onPress={() => router.push('/registro')}
            bg="rgba(232,134,60,0.15)"
            border="rgba(232,134,60,0.35)">
            <Ionicons name="clipboard-outline" size={18} color={c.negative} />
          </RoundButton>
        ) : null}
        {isComision ? (
          <RoundButton
            label="Administración"
            onPress={() => router.push('/admin')}
            bg="rgba(229,57,53,0.12)"
            border="rgba(229,57,53,0.35)">
            <Ionicons name="settings-outline" size={18} color={c.primaryLight} />
          </RoundButton>
        ) : null}
        {user ? (
          <RoundButton label="Mi perfil" onPress={() => router.push('/perfil')} bg={c.surface1} border={c.surfaceBorder}>
            <Ionicons name="person-outline" size={19} color={c.onSurfaceMuted} />
          </RoundButton>
        ) : null}
      </View>
    </View>
  );
}
