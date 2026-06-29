import { router } from 'expo-router';
import { ArrowRight, CheckCircle, Scale, Shield, Zap } from 'lucide-react-native';
import { useRef } from 'react';
import { Animated, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Dark amber design tokens ─────────────────────────────────────
const C = {
  bg:        '#0C0A07',
  surface:   '#181410',
  surface2:  '#221C10',
  surface3:  '#2C2412',
  ink:       '#FAF8F5',
  ink2:      'rgba(250,248,245,0.55)',
  ink3:      'rgba(250,248,245,0.30)',
  amber:     '#F59E0B',
  amberDim:  '#D97706',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberGlow: 'rgba(245,158,11,0.07)',
  border:    'rgba(245,158,11,0.14)',
  border2:   'rgba(250,248,245,0.06)',
  danger:    '#F87171',
  ok:        '#34D399',
};

const STATS = [
  { value: '฿2.3M', label: 'Recovered' },
  { value: '142',   label: 'Cases won' },
  { value: '98%',   label: 'Success rate' },
];

const HOW = [
  { n: '01', title: 'Photo comparison', sub: 'AI detects real damage vs normal wear', icon: Scale },
  { n: '02', title: 'Contract analysis', sub: 'Finds void clauses in your lease', icon: Shield },
  { n: '03', title: 'Legal reasoning',   sub: 'Applies Thai law §546–563 + OCPB 2568', icon: Scale },
  { n: '04', title: 'Document export',   sub: 'Generates OCPB complaint & demand letter', icon: Zap },
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 32, position: 'relative', overflow: 'hidden' }}>
          {/* Ambient glow orbs — decorative */}
          <View style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(245,158,11,0.06)' }} />
          <View style={{ position: 'absolute', top: 20, right: 20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,158,11,0.04)' }} />
          <View style={{ position: 'absolute', top: 60, left: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(245,158,11,0.03)' }} />

          {/* Brand */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#0C0A07', fontSize: 14, fontWeight: '900' }}>RW</Text>
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink, letterSpacing: -0.3 }}>RoomWitness</Text>
                <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '500' }}>Thai Rental Dispute AI</Text>
              </View>
            </View>
            <View style={{ backgroundColor: C.amberSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 10, color: C.amber, fontWeight: '700' }}>v1.0 BETA</Text>
            </View>
          </View>

          {/* Headline */}
          <Text style={{ fontSize: 13, color: C.amber, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            For Bangkok Renters
          </Text>
          <Text style={{ fontSize: 44, fontWeight: '900', color: C.ink, letterSpacing: -2, lineHeight: 48, marginBottom: 16 }}>
            Stop letting your landlord steal your deposit.
          </Text>
          <Text style={{ fontSize: 16, color: C.ink2, lineHeight: 26, marginBottom: 32 }}>
            Our 4-agent AI analyzes your photos, lease, and chat history — then generates ready-to-file Thai legal documents in under 90 seconds.
          </Text>

          {/* CTA */}
          <Pressable
            onPress={() => router.push('/new-case')}
            style={{ backgroundColor: C.amber, borderRadius: 18, paddingVertical: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}
          >
            <Text style={{ color: '#0C0A07', fontSize: 17, fontWeight: '900', letterSpacing: -0.4 }}>Start New Case</Text>
            <ArrowRight size={20} color="#0C0A07" strokeWidth={2.5} />
          </Pressable>
          <Text style={{ fontSize: 12, color: C.ink3, textAlign: 'center' }}>
            Free · No account required · Results in &lt;90 seconds
          </Text>
        </View>

        {/* ── Stats row ─────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 32 }}>
          {STATS.map((s, i) => (
            <View key={i} style={{
              flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 16,
              borderWidth: 1, borderColor: C.border, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: C.amber, letterSpacing: -1 }}>{s.value}</Text>
              <Text style={{ fontSize: 11, color: C.ink3, fontWeight: '600', marginTop: 3 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Quick benefit pills ───────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10, marginBottom: 36 }}>
          {['Photos analyzed by AI', 'Thai law §546–563', 'OCPB 2568', 'Ready-to-file PDFs', 'Wear & tear defense'].map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
              <CheckCircle size={12} color={C.amber} strokeWidth={2.5} />
              <Text style={{ fontSize: 13, color: C.ink2, fontWeight: '600' }}>{t}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── How it works ──────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 32 }}>
          <Text style={{ fontSize: 11, color: C.ink3, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
            How it works
          </Text>
          <View style={{ backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            {HOW.map((h, i) => (
              <View key={h.n} style={{
                flexDirection: 'row', alignItems: 'center', gap: 14,
                paddingVertical: 18, paddingHorizontal: 20,
                borderBottomWidth: i < HOW.length - 1 ? 1 : 0,
                borderBottomColor: C.border2,
              }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.amberSoft, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: C.amber }}>{h.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{h.title}</Text>
                  <Text style={{ fontSize: 12, color: C.ink3, marginTop: 2 }}>{h.sub}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Legal disclaimer ──────────────────────────────────── */}
        <View style={{ marginHorizontal: 20, backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 11, color: C.ink3, lineHeight: 18, textAlign: 'center' }}>
            Powered by Groq Llama-4-Scout + Typhoon v2 + ChromaDB RAG{'\n'}
            Legal basis: ป.พ.พ. §537–571 · OCPB Notification B.E. 2568{'\n'}
            <Text style={{ color: C.amber }}>BDI Bangkok Hackathon 2026</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
