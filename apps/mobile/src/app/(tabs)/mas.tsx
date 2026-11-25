/**
 * "Más": índice de las secciones que no están en la barra inferior, filtrado
 * por rol con los mismos permisos que la web (/mas). Incluye lo que la web
 * reparte entre Más y la barra superior (fecha, timer, jugadores, ayuda) y,
 * para la Comisión, Administración, Reportes y Compartir.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, type Href } from 'expo-router';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Header } from '@/components/ui/Header';
import { CPButton } from '@/components/ui/CPButton';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { Body, Muted, Overline } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import type { FeaturePermission } from '@poker/shared';
import { cpLight as c } from '@/theme/colors';

type Item = {
  title: string;
  /** 'me' = el perfil de torneo del usuario (/players/[su id]). */
  href: Href | 'me';
  icon: React.ComponentProps<typeof Ionicons>['name'];
  permission?: FeaturePermission;
};

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: 'Torneo',
    items: [
      { title: 'Tabla del torneo', href: '/tabla', icon: 'trophy-outline' },
      { title: 'Fecha', href: '/fecha', icon: 'today-outline' },
      { title: 'Calendario', href: '/calendario', icon: 'calendar-outline', permission: 'calendar' },
      { title: 'Timer', href: '/timer', icon: 'timer-outline' },
      { title: 'Registro', href: '/registro', icon: 'create-outline', permission: 'eliminations' },
      { title: 'Propuestas', href: '/propuestas-v2', icon: 'chatbubbles-outline', permission: 't29-proposals' },
    ],
  },
  {
    title: 'Grupo',
    items: [
      { title: 'Mi perfil', href: 'me', icon: 'person-circle-outline' },
      { title: 'Ajustes', href: '/perfil', icon: 'settings-outline', permission: 'profile' },
      { title: 'Jugadores', href: '/players', icon: 'people-outline' },
      { title: 'Contactos', href: '/contactos', icon: 'call-outline' },
      { title: 'Multas', href: '/multas', icon: 'receipt-outline' },
      { title: 'Reglamento e info', href: '/info', icon: 'book-outline', permission: 'regulations' },
      { title: 'Notificaciones', href: '/ayuda/notificaciones', icon: 'notifications-outline' },
      { title: 'Ayuda', href: '/ayuda', icon: 'help-circle-outline' },
    ],
  },
  {
    title: 'Comisión',
    items: [
      { title: 'Administración', href: '/admin', icon: 'shield-outline', permission: 'tournaments' },
      { title: 'Torneos', href: '/tournaments', icon: 'trophy-outline', permission: 'tournaments' },
      { title: 'Reportes', href: '/reportes', icon: 'document-text-outline', permission: 'tournaments' },
      { title: 'Compartir al grupo', href: '/compartir', icon: 'share-social-outline', permission: 'tournaments' },
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
    <Screen edges={['top']} tone="light" appBar>
      <Header
        overline={role ?? undefined}
        title="Más"
        subtitle={user ? `${user.firstName} ${user.lastName}` : undefined}
      />

      {sections.map((section) => (
        <View key={section.title} className="gap-2">
          <Overline>{section.title}</Overline>
          <CPCard className="p-2">
            {section.items.map((item, idx) => (
              <Pressable
                key={item.title}
                onPress={() =>
                  item.href === 'me'
                    ? user && router.push({ pathname: '/players/[id]', params: { id: user.id } })
                    : router.push(item.href)
                }
                className={`min-h-[48px] flex-row items-center gap-3 rounded-cp px-3 py-3 active:bg-cp-surface-2 ${
                  idx > 0 ? 'border-t border-cp-surface-border' : ''
                }`}>
                <Ionicons name={item.icon} size={20} color={c.onSurfaceVariant} />
                <Body className="flex-1 font-inter-semibold text-[15px]">{item.title}</Body>
                <Ionicons name="chevron-forward" size={16} color={c.onSurfaceVariant} />
              </Pressable>
            ))}
          </CPCard>
        </View>
      ))}

      {biometric.available ? (
        <CPCard className="flex-row items-center gap-3">
          <Ionicons name={biometric.kind === 'faceid' ? 'scan-outline' : 'finger-print-outline'} size={20} color={c.onSurfaceVariant} />
          <View className="flex-1">
            <Body>Entrar con {biometric.label}</Body>
            <Muted>Desbloquea tu clave guardada al abrir la app.</Muted>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={toggleBiometric}
            trackColor={{ true: c.primary, false: c.surface3 }}
            thumbColor={c.surface1}
          />
        </CPCard>
      ) : null}

      <CPButton title="Cerrar sesión" variant="outline" onPress={logout} />
    </Screen>
  );
}
