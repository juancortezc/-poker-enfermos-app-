import { Redirect } from 'expo-router';

/** Igual que la web: `/` lleva al home. */
export default function Index() {
  return <Redirect href="/home" />;
}
