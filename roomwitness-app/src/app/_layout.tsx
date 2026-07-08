import '../global.css';
import { BaiJamjuree_600SemiBold } from '@expo-google-fonts/bai-jamjuree';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular } from '@expo-google-fonts/inter';
import { NotoSansThai_400Regular } from '@expo-google-fonts/noto-sans-thai';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BaiJamjuree_600SemiBold,
    NotoSansThai_400Regular,
    IBMPlexMono_500Medium,
    Inter_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#0C0A07" />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: '#0C0A07' } }}>
        <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
        <Stack.Screen name="move-in" />
        <Stack.Screen name="new-case" />
        <Stack.Screen name="paywall" />
        <Stack.Screen name="analyzing" />
        <Stack.Screen name="results" />
        <Stack.Screen name="details" />
        <Stack.Screen name="documents" />
      </Stack>
    </>
  );
}
