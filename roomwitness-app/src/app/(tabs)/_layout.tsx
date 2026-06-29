import { Tabs } from 'expo-router';
import { History, Home, User } from 'lucide-react-native';
import { Platform } from 'react-native';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';

export default function TabLayout() {
  const theme = useStore(s => s.theme);
  const C     = getColors(theme);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.amber,
        tabBarInactiveTintColor: C.ink3,
        tabBarStyle: {
          backgroundColor: C.navBg,
          borderTopColor: C.navBorder,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          elevation: 20,
          shadowColor: C.amber,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: theme === 'dark' ? 0.08 : 0.04,
          shadowRadius: 16,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={2} /> }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'History', tabBarIcon: ({ color }) => <History size={22} color={color} strokeWidth={2} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2} /> }}
      />
    </Tabs>
  );
}
