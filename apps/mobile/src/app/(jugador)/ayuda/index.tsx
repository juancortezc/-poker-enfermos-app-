/**
 * Ayuda. La web no tiene un índice de ayuda (solo /ayuda/notificaciones);
 * en la app se juntan aquí las dudas frecuentes con enlace a cada sección.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, type Href } from 'expo-router';
import { Pressable, View } from 'react-native';

import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { Body, Muted } from '@/components/ui/Typography';
import { useAuth } from '@/contexts/AuthContext';
import { cpLight as c } from '@/theme/colors';

type Item = { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; detail: string; href: Href; profileOnly?: boolean };

const ITEMS: Item[] = [
  {
    icon: 'notifications-outline',
    title: 'Notificaciones',
    detail: 'Cómo activarlas y qué hacer si las bloqueaste.',
    href: '/ayuda/notificaciones',
  },
  {
    icon: 'book-outline',
    title: 'Reglamento y puntos',
    detail: 'Cómo se reparten los puntos, horarios, multas y conducta.',
    href: '/info',
  },
  {
    icon: 'list-outline',
    title: 'Cómo leer la tabla',
    detail: 'PUNTOS es lo que manda: las mejores fechas, sin las peores que descarta el ELIMINA. ACUM. es la suma de todo.',
    href: '/ranking',
  },
  {
    icon: 'key-outline',
    title: 'Cambiar mi clave',
    detail: 'Desde Mi perfil. La nueva clave admite letras y números.',
    href: '/perfil',
    profileOnly: true,
  },
  {
    icon: 'scan-outline',
    title: 'Entrar con Face ID o huella',
    detail: 'Activalo en Mi perfil o en Más. La clave queda guardada en el llavero del teléfono.',
    href: '/mas',
  },
  {
    icon: 'call-outline',
    title: 'Hablar con la Comisión',
    detail: 'En Contactos están todos; la Comisión lleva una C.',
    href: '/contactos',
  },
];

export default function AyudaScreen() {
  const { can } = useAuth();
  const items = ITEMS.filter((i) => !i.profileOnly || can('profile'));

  return (
    <>
      <Stack.Screen options={{ title: 'Ayuda' }} />
      <Screen tone="light">
        <CPCard className="p-0">
          {items.map((item, idx) => (
            <Pressable
              key={item.title}
              accessibilityRole="link"
              onPress={() => router.push(item.href)}
              className={`min-h-[64px] flex-row items-center gap-3 px-5 py-4 active:bg-cp-surface-2 ${idx > 0 ? 'border-t border-cp-surface-border' : ''}`}>
              <Ionicons name={item.icon} size={20} color={c.info} />
              <View className="flex-1 gap-0.5">
                <Body className="text-base">{item.title}</Body>
                <Muted>{item.detail}</Muted>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.onSurfaceVariant} />
            </Pressable>
          ))}
        </CPCard>
      </Screen>
    </>
  );
}
