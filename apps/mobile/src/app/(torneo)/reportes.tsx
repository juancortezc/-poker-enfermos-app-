import { Stack } from 'expo-router';

import { PlaceholderScreen } from '@/components/PlaceholderScreen';

export default function ReportesScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Reportes' }} />
      <PlaceholderScreen title="Reportes" area="Torneo" webPath="/reportes" />
    </>
  );
}
