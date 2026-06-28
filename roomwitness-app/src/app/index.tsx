import { Redirect } from 'expo-router';

// Root index redirects to the tab navigator home
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
