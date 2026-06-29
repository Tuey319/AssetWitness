import { Tabs } from 'expo-router';
import { History, Home, User } from 'lucide-react-native';
import { Platform } from 'react-native';

// Dark amber theme tokens
const AMBER = '#F59E0B';
const DIM   = 'rgba(250,248,245,0.35)';
const NAV_BG = '#0E0B07';
const NAV_BORDER = 'rgba(245,158,11,0.18)';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: AMBER,
        tabBarInactiveTintColor: DIM,
        tabBarStyle: {
          backgroundColor: NAV_BG,
          borderTopColor: NAV_BORDER,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 66,
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          elevation: 24,
          shadowColor: AMBER,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.3,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <History size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={22} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
