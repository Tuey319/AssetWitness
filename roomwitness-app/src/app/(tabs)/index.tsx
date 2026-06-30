import { router } from 'expo-router';
import { ArrowRight, BadgeCheck, CheckCircle, HandCoins, Home as HomeIcon, ShieldCheck, Users } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '@/lib/theme';
import { useStore } from '@/lib/store';

type Side = 'tenant' | 'landlord';

const TENANT_STATS = [
  { value: '฿2.3M', label: 'Recovered' },
  { value: '142',   label: 'Cases won'  },
  { value: '98%',   label: 'Success'    },
];

const LANDLORD_STATS = [
  { value: '4.8★',  label: 'Avg rating' },
  { value: '89',    label: 'Certified units' },
  { value: '0',     label: 'False claims' },
];

const BENEFITS = ['Photos analyzed by AI', 'Thai law §546–563', 'OCPB 2568', 'Ready-to-file PDFs', 'Wear & tear defense'];

const HOW = [
  { n: '01', title: 'Photo comparison', sub: 'AI detects real damage vs normal wear' },
  { n: '02', title: 'Contract analysis', sub: 'Finds void clauses in your lease' },
  { n: '03', title: 'Legal reasoning',   sub: 'Applies Thai law + OCPB 2568' },
  { n: '04', title: 'Document export',   sub: 'OCPB complaint + demand letter' },
];

const HERO_COPY: Record<Side, { tag: string; headline: string; sub: string; cta: string }> = {
  tenant: {
    tag: 'For Bangkok Renters',
    headline: 'Stop letting your landlord steal your deposit.',
    sub: 'Our 4-agent AI analyzes your photos, lease, and chat history — then generates ready-to-file Thai legal documents in under 90 seconds.',
    cta: 'Start New Case',
  },
  landlord: {
    tag: 'For Property Owners',
    headline: 'Settle deposit disputes fairly — without losing good tenants.',
    sub: 'RoomWitness gives both sides an unbiased AI verdict on legitimate damage claims, so disputes resolve in minutes, not small-claims court.',
    cta: 'List Your Property',
  },
};

export default function HomeScreen() {
  const theme   = useStore(s => s.theme);
  const profile = useStore(s => s.profile);
  const C       = getColors(theme);
  const isDark  = theme === 'dark';
  const [side, setSide] = useState<Side>('tenant');
  const copy  = HERO_COPY[side];
  const stats = side === 'tenant' ? TENANT_STATS : LANDLORD_STATS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── Hero ───────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28, position: 'relative', overflow: 'hidden' }}>
          {/* Ambient glow */}
          <View style={{ position: 'absolute', top: -50, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: C.amberGlow }} />
          <View style={{ position: 'absolute', top: 40, left: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: isDark ? 'rgba(96,165,250,0.04)' : 'rgba(37,99,235,0.03)' }} />

          {/* Brand */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#0C0A07', fontSize: 13, fontWeight: '900' }}>RW</Text>
              </View>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>RoomWitness</Text>
                <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '500' }}>Fair Rental Dispute AI</Text>
              </View>
            </View>
            {profile.nameTh ? (
              <View style={{ backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '600' }}>Hi, {profile.nameTh.split(' ')[0]} 👋</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: C.amberSoft, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 10, color: C.amber, fontWeight: '700' }}>v1.0 BETA</Text>
              </View>
            )}
          </View>

          {/* Tenant / Landlord toggle */}
          <View style={{ flexDirection: 'row', backgroundColor: C.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.border, marginBottom: 24 }}>
            {([
              { key: 'tenant' as const,   label: 'I’m a Tenant',   icon: Users },
              { key: 'landlord' as const, label: 'I’m a Landlord', icon: HomeIcon },
            ]).map(opt => {
              const active = side === opt.key;
              const Icon = opt.icon;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setSide(opt.key)}
                  style={{
                    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                    paddingVertical: 10, borderRadius: 10,
                    backgroundColor: active ? C.amber : 'transparent',
                  }}
                >
                  <Icon size={14} color={active ? '#0C0A07' : C.ink3} strokeWidth={2.25} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#0C0A07' : C.ink3 }}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Headline */}
          <Text style={{ fontSize: 13, color: C.amber, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            {copy.tag}
          </Text>
          <Text style={{ fontSize: 38, fontWeight: '900', color: C.ink, letterSpacing: -1.6, lineHeight: 42, marginBottom: 16 }}>
            {copy.headline}
          </Text>
          <Text style={{ fontSize: 16, color: C.ink2, lineHeight: 26, marginBottom: 28 }}>
            {copy.sub}
          </Text>

          {/* CTA */}
          <Pressable
            onPress={() => side === 'tenant' ? router.push('/new-case') : router.push('/new-case')}
            style={{ backgroundColor: C.amber, borderRadius: 18, paddingVertical: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 14 }}
          >
            <Text style={{ color: '#0C0A07', fontSize: 17, fontWeight: '900', letterSpacing: -0.4 }}>{copy.cta}</Text>
            <ArrowRight size={20} color="#0C0A07" strokeWidth={2.5} />
          </Pressable>
          <Text style={{ fontSize: 12, color: C.ink3, textAlign: 'center' }}>
            {side === 'tenant' ? 'Free · No account required · Results in <90 seconds' : 'Free to list · Verified by AI · No commission to start'}
          </Text>
        </View>

        {/* ── Stats ──────────────────────────────── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 24 }}>
          {stats.map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: C.amber, letterSpacing: -1 }}>{s.value}</Text>
              <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600', marginTop: 3 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Built for both sides ─────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <Text style={{ fontSize: 11, color: C.ink3, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Built for both sides
          </Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: side === 'tenant' ? C.amber + '55' : C.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <Users size={15} color={C.amber} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink, marginBottom: 4 }}>Tenants</Text>
              <Text style={{ fontSize: 11, color: C.ink3, lineHeight: 16 }}>Free AI evidence review, citing real Thai law — not guesswork.</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: side === 'landlord' ? C.amber + '55' : C.border }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <HandCoins size={15} color={C.amber} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink, marginBottom: 4 }}>Landlords</Text>
              <Text style={{ fontSize: 11, color: C.ink3, lineHeight: 16 }}>Defend legitimate claims fast, avoid OCPB complaints and bad reviews.</Text>
            </View>
          </View>
        </View>

        {/* ── Damage agreement teaser ───────────────── */}
        <View style={{ marginHorizontal: 20, marginBottom: 24, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
            <HandCoins size={18} color={C.amber} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>Fair Price Agreement</Text>
              <View style={{ backgroundColor: C.amberSoft, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: C.amber }}>COMING SOON</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: C.ink3, lineHeight: 18 }}>
              AI estimates fair repair cost from market data, then both tenant and landlord digitally approve — no more guessing what's reasonable.
            </Text>
          </View>
        </View>

        {/* ── Certification teaser ──────────────────── */}
        <View style={{ marginHorizontal: 20, marginBottom: 28, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} color={C.amber} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <BadgeCheck size={13} color={C.amber} strokeWidth={2} />
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink }}>RoomWitness Certified</Text>
            </View>
            <Text style={{ fontSize: 12, color: C.ink3, lineHeight: 18 }}>
              Landlords with a clean dispute history earn a Certified badge — a trust signal renters can filter by when choosing where to live.
            </Text>
          </View>
        </View>

        {/* ── How it works ───────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <Text style={{ fontSize: 11, color: C.ink3, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            How it works
          </Text>
          <View style={{ backgroundColor: C.surface, borderRadius: 22, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            {HOW.map((h, i) => (
              <View key={h.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: i < HOW.length - 1 ? 1 : 0, borderBottomColor: C.border2 }}>
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

        {/* ── Benefit pills ───────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 28 }}>
          {BENEFITS.map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
              <CheckCircle size={12} color={C.amber} strokeWidth={2.5} />
              <Text style={{ fontSize: 13, color: C.ink2, fontWeight: '600' }}>{t}</Text>
            </View>
          ))}
        </ScrollView>

        {/* ── Footer disclaimer ──────────────────── */}
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
