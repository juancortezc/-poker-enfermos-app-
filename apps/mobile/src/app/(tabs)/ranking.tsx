/**
 * Tabla del torneo activo (web: /ranking con CPRankingView). /tabla es un
 * alias, igual que en la web.
 */
import { RankingScreenContent } from '@/components/jugador/RankingScreenContent';

export default function RankingScreen() {
  return <RankingScreenContent edges={['top']} showHeader />;
}
