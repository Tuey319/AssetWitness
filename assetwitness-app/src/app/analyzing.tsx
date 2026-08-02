import { router } from 'expo-router';
import { CheckCircle2, RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { analyze } from '@/lib/api';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';

// Only 3 steps — Agent 04 runs separately on /documents
const STEPS = [
  { label: 'Comparing condition',   sub: 'Condition · Groq Llama-4-Scout',                 color: '#60A5FA' },
  { label: 'Parsing agreement',     sub: 'Agreement · Typhoon v2',                          color: '#C084FC' },
  { label: 'Applying asset policy', sub: 'Policy RAG · State Property Act + MOF Regulation', color: '#34D399' },
];

function RingSpinner({ color }: { color: string }) {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.timing(rot, { toValue: 1, duration: 750, easing: Easing.linear, useNativeDriver: true })).start();
  }, [rot]);
  return (
    <Animated.View style={{ transform: [{ rotate: rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
      <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2.5, borderColor: color, borderTopColor: 'transparent' }} />
    </Animated.View>
  );
}

export default function AnalyzingScreen() {
  const form          = useStore(s => s.form);
  const setResult     = useStore(s => s.setResult);
  const theme     = useStore(s => s.theme);
  const C         = getColors(theme);
  const [step, setStep]   = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Pulsing orb
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.15, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 950, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();
  }, [pulse]);

  useEffect(() => {
    if (!form) { router.replace('/'); return; }

    // Advance step indicator every 4s while waiting
    const timers = [
      setTimeout(() => setStep(1), 4000),
      setTimeout(() => setStep(2), 10000),
    ];

    analyze(form)
      .then(data => { setResult(data); router.replace('/results'); })
      .catch((err: Error) => {
        timers.forEach(clearTimeout);
        setError(err.message || 'Could not reach the server');
      });

    return () => timers.forEach(clearTimeout);
  }, []);

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 }}>
        {/* Decorative orbs */}
        <View style={{ position: 'absolute', top: 80, left: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(248,113,113,0.04)', pointerEvents: 'none' }} />
        <View style={{ position: 'absolute', bottom: 100, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(245,158,11,0.04)', pointerEvents: 'none' }} />

        <View style={{ backgroundColor: 'rgba(248,113,113,0.08)', borderRadius: 24, padding: 28, width: '100%', borderWidth: 1, borderColor: 'rgba(248,113,113,0.2)', marginBottom: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.danger, marginBottom: 10, letterSpacing: -0.4 }}>Analysis failed</Text>
          <Text style={{ fontSize: 14, color: 'rgba(248,113,113,0.8)', textAlign: 'center', lineHeight: 22 }}>{error}</Text>

          {error.includes('server') && (
            <View style={{ marginTop: 16, backgroundColor: C.surface2, borderRadius: 14, padding: 14, width: '100%', borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 1, marginBottom: 8 }}>TROUBLESHOOTING</Text>
              <Text style={{ fontSize: 12, color: C.ink2, lineHeight: 20 }}>
                1. Make sure Express is running:{'\n'}
                <Text style={{ color: C.amberDark, fontFamily: 'IBMPlexMono_500Medium' }}>  cd express-backend && npm run dev{'\n'}</Text>
                2. Check your IP in assetwitness-app/.env{'\n'}
                3. Or set EXPO_PUBLIC_USE_MOCK=true to demo
              </Text>
            </View>
          )}
        </View>

        <Pressable onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 28, borderWidth: 1, borderColor: C.border }}>
          <RefreshCw size={16} color={C.ink2} strokeWidth={2} />
          <Text style={{ fontSize: 15, color: C.ink, fontWeight: '700' }}>Go back &amp; retry</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'center' }}>
        {/* Ambient glow orbs */}
        <View style={{ position: 'absolute', top: 60, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(245,158,11,0.04)', pointerEvents: 'none' }} />
        <View style={{ position: 'absolute', bottom: 80, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(96,165,250,0.04)', pointerEvents: 'none' }} />

        {/* Central orb */}
        <View style={{ alignItems: 'center', marginBottom: 48 }}>
          <Animated.View style={{ transform: [{ scale: pulse }] }}>
            <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: C.amberSoft, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: C.surface2, borderWidth: 1.5, borderColor: C.amber + '40', alignItems: 'center', justifyContent: 'center' }}>
                <RingSpinner color={C.amberDark} />
              </View>
            </View>
          </Animated.View>

          <View style={{ marginTop: 28, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -1 }}>Analyzing…</Text>
            <Text style={{ fontSize: 15, color: C.ink2, marginTop: 6 }}>AI agents are reviewing your case</Text>
          </View>
        </View>

        {/* Steps */}
        <View style={{ gap: 10 }}>
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 18,
                backgroundColor: done ? (C.ok + '0D') : active ? C.amberSoft : C.surface,
                borderWidth: 1,
                borderColor: done ? (C.ok + '30') : active ? C.border : C.border2,
                opacity: i > step ? 0.4 : 1,
              }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: done ? (C.ok + '20') : active ? (s.color + '20') : C.surface2, alignItems: 'center', justifyContent: 'center' }}>
                  {done
                    ? <CheckCircle2 size={20} color={C.ok} strokeWidth={2} />
                    : active
                    ? <RingSpinner color={s.color} />
                    : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.border }} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: done ? C.ok : active ? C.ink : C.ink3 }}>{s.label}</Text>
                  <Text style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>{s.sub}</Text>
                </View>
                {done   && <Text style={{ fontSize: 12, color: C.ok, fontWeight: '700' }}>Done</Text>}
                {active && <Text style={{ fontSize: 12, color: C.amberDark, fontWeight: '700' }}>Running…</Text>}
              </View>
            );
          })}
        </View>

        <Text style={{ fontSize: 12, color: C.ink3, textAlign: 'center', marginTop: 28 }}>
          Usually takes 30–90 seconds · ใช้เวลาประมาณ 1 นาที
        </Text>
      </View>
    </SafeAreaView>
  );
}
