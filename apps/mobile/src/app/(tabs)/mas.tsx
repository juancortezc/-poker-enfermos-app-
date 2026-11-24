/**
 * "Más": índice de todas las secciones que no están en la barra inferior,
 * filtrado por rol con los mismos permisos que la web. El agente de F3 lo
 * ajustará a la página /mas de la web; mientras, sirve para navegar a todas
 * las pantallas y para cerrar sesión / gestionar la biometría.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Header } from '@/components/ui/Header';
import { NoirButton } from '@/components/ui/NoirButton';
import { NoirCard } from '@/components/ui/NoirCard';
import { Screen } from '@/components/ui/Screen';
import { Body, Muted, Overline } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import type { FeaturePermission } from '@poker/shared';
import { noir } from '@/theme/colors';

type Item = {
  title: string;
  href: Href;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  permission?: FeaturePermission;
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Torneo',
    items: [
      { title: 'Fecha', href: '/fecha', icon: 'today-outline' },
      { title: 'Calendario', href: '/calendario', icon: 'calendar-outline', permission: 'calendar' },
      { title: 'Tabla completa', href: '/tabla', icon: 'grid-outline' },
      { title: 'Timer', href: '/timer', icon: 'timer-outline' },
      { title: 'Registro', href: '/registro', icon: 'create-outline', permission: 'eliminations' },
      { title: 'Propuestas', href: '/propuestas-v2', icon: 'chatbubbles-outline', permission: 't29-proposals' },
      { title: 'Reportes', href: '/reportes', icon: 'document-text-outline' },
    ],
  },
  {
    title: 'Grupo',
    items: [
      { title: 'Perfil', href: '/perfil', icon: 'person-outline', permission: 'profile' },
      { title: 'Jugadores', href: '/players', icon: 'people-outline' },
      { title: 'Contactos', href: '/contactos', icon: 'call-outline' },
      { title: 'Multas', href: '/multas', icon: 'cash-outline' },
      { title: 'Info', href: '/info', icon: 'information-circle-outline' },
      { title: 'Ayuda', href: '/ayuda', icon: 'help-circle-outline' },
    ],
  },
  {
    title: 'Comisión',
    items: [
      { title: 'Admin', href: '/admin', icon: 'shield-outline', permission: 'tournaments' },
      { title: 'Torneos', href: '/tournaments', icon: 'trophy-outline', permission: 'tournaments' },
    ],
  },
];

export default function MasScreen() {
  const { user, role, can, logout, biometric, biometricEnabled, setBiometricEnabled } = useAuth();

  const sections = SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.permission || can(i.permission)),
  })).filter((s) => s.items.length > 0);

  const toggleBiometric = async (value: boolean) => {
    const ok = await setBiometricEnabled(value);
    if (!ok && value) Alert.alert('No se pudo activar', `No se confirmó ${biometric.label}.`);
  };

  return (
    <Screen edges={['top']}>
      <Header
        overline={role ?? undefined}
        title="Más"
        subtitle={user ? `${user.firstName} ${user.lastName}` : undefined}
      />

      {sections.map((section) => (
        <View key={section.title} className="gap-2">
          <Overline>{section.title}</Overline>
          <NoirCard className="p-0">
            {section.items.map((item, idx) => (
              <Pressable
                key={item.title}
                onPress={() => router.push(item.href)}
                className={`flex-row items-center gap-3 px-5 py-4 active:bg-noir-raised ${
                  idx > 0 ? 'border-t border-noir-border' : ''
                }`}>
                <Ionicons name={item.icon} size={22} color={noir.gold} />
                <Body className="flex-1">{item.title}</Body>
                <Ionicons name="chevron-forward" size={18} color={noir.muted} />
              </Pressable>
            ))}
          </NoirCard>
        </View>
      ))}

      {biometric.available ? (
        <NoirCard className="flex-row items-center gap-3">
          <Ionicons name={biometric.kind === 'faceid' ? 'scan-outline' : 'finger-print-outline'} size={22} color={noir.gold} />
          <View className="flex-1">
            <Body>Entrar con {biometric.label}</Body>
            <Muted>Desbloquea tu clave guardada al abrir la app.</Muted>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={toggleBiometric}
            trackColor={{ true: noir.copper, false: noir.border }}
            thumbColor={biometricEnabled ? noir.gold : noir.muted}
          />
        </NoirCard>
      ) : null}

      <NoirButton title="Cerrar sesión" variant="outline" onPress={logout} />
    </Screen>
  );
}
