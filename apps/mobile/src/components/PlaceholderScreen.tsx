/**
 * Pantalla provisional. Los agentes de F3–F6 reemplazan cada uso por la
 * pantalla real; `webPath` indica qué página de la web hay que portar.
 */
import type { Edge } from 'react-native-safe-area-context';

import { Header } from '@/components/ui/Header';
import { CPCard } from '@/components/ui/CPCard';
import { Screen } from '@/components/ui/Screen';
import { Muted } from '@/components/ui/Typography';

type Props = {
  title: string;
  area: 'Jugador' | 'En vivo' | 'Torneo' | 'Comisión' | 'Inicio';
  webPath: string;
  edges?: Edge[];
};

export function PlaceholderScreen({ title, area, webPath, edges }: Props) {
  return (
    <Screen edges={edges}>
      <Header overline={area} title={title} />
      <CPCard>
        <Muted>En construcción. Equivale a {webPath} en la web.</Muted>
      </CPCard>
    </Screen>
  );
}
