import { router } from 'expo-router';
import {
  Bell, Camera, CheckCircle2, ChevronRight, Clock, Droplet, FileText, Heart,
  Paintbrush, PlugZap, PlusCircle, Scale, Search, ShieldCheck, Sofa, Sparkles, SquareStack,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '@/lib/theme';
import { useStore } from '@/lib/store';

// ─── Mock data — replace with real store data once cases persist ────
const RECENT_CASES = [
  { id: 'RW-2026-001', item: 'Wall paint + Floor scratch', date: '28 Jun', total: 8000, unlawful: 5000, verdict: 'UNLAWFUL' as const },
  { id: 'RW-2026-002', item: 'Sofa + Coffee table',        date: '15 Jun', total: 30000, unlawful: 18000, verdict: 'DISPUTED' as const },
  { id: 'RW-2026-003', item: 'Deep cleaning',               date: '2 Jun',  total: 2000,  unlawful: 0, verdict: 'LAWFUL' as const },
];

const VCFG = {
  UNLAWFUL: { label: 'Unlawful', text: '#F87171', bg: 'rgba(248,113,113,0.12)' },
  DISPUTED: { label: 'Disputed', text: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  LAWFUL:   { label: 'Lawful',   text: '#34D399', bg: 'rgba(52,211,153,0.12)' },
};

const CATEGORIES = [
  { key: 'wall',  label: 'Wall/Paint', icon: Paintbrush },
  { key: 'floor', label: 'Floor',      icon: SquareStack },
  { key: 'furn',  label: 'Furniture',  icon: Sofa },
  { key: 'clean', label: 'Cleaning',   icon: Sparkles },
  { key: 'appl',  label: 'Appliance',  icon: PlugZap },
  { key: 'plumb', label: 'Plumbing',   icon: Droplet },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const theme         = useStore(s => s.theme);
  const profile       = useStore(s => s.profile);
  const moveInRecords = useStore(s => s.moveInRecords);
  const C       = getColors(theme);
  const firstName = profile.nameTh ? profile.nameTh.split(' ')[0] : 'there';
  const activeCase = RECENT_CASES[0]; // most recent / in-progress case
  const hasMoveIn = moveInRecords.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── Header: avatar + greeting + icons ───────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0C0A07' }}>
                {profile.nameTh ? profile.nameTh.charAt(0) : 'R'}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 12, color: C.ink3, fontWeight: '500' }}>{greeting()},</Text>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{firstName}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => router.push('/(tabs)/history')}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
              <Heart size={16} color={C.ink2} strokeWidth={2} />
            </Pressable>
            <Pressable
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
              <Bell size={16} color={C.ink2} strokeWidth={2} />
              <View style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.amber, borderWidth: 1.5, borderColor: C.surface }} />
            </Pressable>
          </View>
        </View>

        {/* ── Search bar ───────────────────────────────────── */}
        <Pressable
          onPress={() => router.push('/(tabs)/history')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 16, backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: C.border }}
        >
          <Search size={17} color={C.ink3} strokeWidth={2} />
          <Text style={{ fontSize: 14, color: C.ink3 }}>Search cases, claim types…</Text>
        </Pressable>

        {/* ── Banner: free move-in vault vs paid claim ─────── */}
        {hasMoveIn ? (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
            <View style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: C.amberGlow }} />
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <ShieldCheck size={12} color={C.ok} strokeWidth={2} />
                <Text style={{ fontSize: 10, color: C.ok, fontWeight: '700', letterSpacing: 0.5 }}>
                  {moveInRecords.length} MOVE-IN RECORD{moveInRecords.length !== 1 ? 'S' : ''} SAVED
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, lineHeight: 20 }}>
                Moving out? File your deposit claim — pay only if you dispute something
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/new-case')}
              style={{ backgroundColor: C.amber, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C0A07' }}>Start Claim</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
            <View style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: C.amberGlow }} />
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Sparkles size={12} color={C.amber} strokeWidth={2} />
                <Text style={{ fontSize: 10, color: C.amber, fontWeight: '700', letterSpacing: 0.5 }}>FREE · TAKES 2 MINUTES</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, lineHeight: 20 }}>
                Just moved in? Document it now, free — for whenever you need it
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/move-in')}
              style={{ backgroundColor: C.amber, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C0A07' }}>Document Move-In</Text>
            </Pressable>
          </View>
        )}

        {/* ── Quick actions ─────────────────────────────────── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
          {[
            { icon: hasMoveIn ? CheckCircle2 : ShieldCheck, label: 'Move-In', onPress: () => router.push('/move-in') },
            { icon: PlusCircle, label: 'File a Claim', onPress: () => router.push('/new-case') },
            { icon: FileText,   label: 'Documents', onPress: () => router.push('/(tabs)/history') },
            { icon: Scale,      label: 'Legal Info', onPress: () => router.push('/(tabs)/profile') },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <Pressable key={i} onPress={a.onPress} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={C.amber} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.ink2 }}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Active case ──────────────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Active Case</Text>
            <Pressable onPress={() => router.push('/(tabs)/history')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 12, color: C.amber, fontWeight: '700' }}>See All</Text>
              <ChevronRight size={13} color={C.amber} strokeWidth={2.5} />
            </Pressable>
          </View>

          <Pressable style={{ backgroundColor: C.amber, borderRadius: 20, padding: 18, position: 'relative', overflow: 'hidden' }}>
            <View style={{ position: 'absolute', bottom: -30, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(0,0,0,0.06)' }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#0C0A07' }}>W</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C0A07' }}>{activeCase.id}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(12,10,7,0.6)', fontWeight: '600' }}>{activeCase.item}</Text>
                </View>
              </View>
              <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: '#0C0A07' }}>{VCFG[activeCase.verdict].label}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Clock size={13} color="#0C0A07" strokeWidth={2.5} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C0A07' }}>Filed {activeCase.date} · ฿{activeCase.unlawful.toLocaleString()} recoverable</Text>
            </View>
          </Pressable>
        </View>

        {/* ── Claim categories ─────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Claim Categories</Text>
            <Pressable onPress={() => router.push('/new-case')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 12, color: C.amber, fontWeight: '700' }}>See All</Text>
              <ChevronRight size={13} color={C.amber} strokeWidth={2.5} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              return (
                <Pressable key={c.key} onPress={() => router.push('/new-case')} style={{ alignItems: 'center', gap: 7, width: 64 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Icon size={22} color={C.amber} strokeWidth={1.75} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2, textAlign: 'center' }}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Recent cases list ─────────────────────────────── */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Recent Cases</Text>
            <Pressable onPress={() => router.push('/(tabs)/history')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 12, color: C.amber, fontWeight: '700' }}>See All</Text>
              <ChevronRight size={13} color={C.amber} strokeWidth={2.5} />
            </Pressable>
          </View>

          {RECENT_CASES.map(c => {
            const v = VCFG[c.verdict];
            return (
              <Pressable key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={18} color={C.amber} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }} numberOfLines={1}>{c.item}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={{ fontSize: 11, color: C.ink3 }}>{c.id} · {c.date}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>฿{c.total.toLocaleString()}</Text>
                  <View style={{ backgroundColor: v.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: v.text }}>{v.label}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
