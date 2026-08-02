import { router } from 'expo-router';
import {
  Bell, Camera, CheckCircle2, ChevronRight, Clock, Droplet, FileText, Heart,
  Paintbrush, PlugZap, PlusCircle, Scale, Search, ShieldCheck, Sofa, Sparkles, SquareStack,
} from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '@/lib/theme';
import { useStore } from '@/lib/store';

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function statusBadge(needsDispute: boolean) {
  return needsDispute
    ? { label: 'Disputed', text: '#F87171', bg: 'rgba(248,113,113,0.12)' }
    : { label: 'Resolved', text: '#34D399', bg: 'rgba(52,211,153,0.12)' };
}

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
  const theme            = useStore(s => s.theme);
  const profile          = useStore(s => s.profile);
  const conditionRecords = useStore(s => s.conditionRecords);
  const cases            = useStore(s => s.cases);
  const C       = getColors(theme);
  const firstName = profile.nameTh ? profile.nameTh.split(' ')[0] : 'there';
  const activeCase = cases[0]; // most recent case
  const hasBaseline = conditionRecords.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── Header: avatar + greeting + icons ───────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#0C0A07' }}>
                {profile.nameTh ? profile.nameTh.charAt(0) : 'A'}
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
              <View style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 3.5, backgroundColor: C.amber, borderWidth: 1.5, borderColor: C.surface, pointerEvents: 'none' }} />
            </Pressable>
          </View>
        </View>

        {/* ── Search bar ───────────────────────────────────── */}
        <Pressable
          onPress={() => router.push('/(tabs)/history')}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 16, backgroundColor: C.surface, borderRadius: 16, paddingHorizontal: 16, height: 50, borderWidth: 1, borderColor: C.border }}
        >
          <Search size={17} color={C.ink3} strokeWidth={2} />
          <Text style={{ fontSize: 14, color: C.ink3 }}>Search handovers, item types…</Text>
        </Pressable>

        {/* ── Banner: baseline vault vs new handover ─────── */}
        {hasBaseline ? (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
            <View style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: C.amberGlow, pointerEvents: 'none' }} />
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <ShieldCheck size={12} color={C.ok} strokeWidth={2} />
                <Text style={{ fontSize: 10, color: C.ok, fontWeight: '700', letterSpacing: 0.5 }}>
                  {conditionRecords.length} BASELINE RECORD{conditionRecords.length !== 1 ? 'S' : ''} SAVED
                </Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, lineHeight: 20 }}>
                Processing a handover? Run the pipeline against your saved baseline
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/new-case')}
              style={{ backgroundColor: C.amber, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C0A07' }}>New Handover</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ marginHorizontal: 20, marginBottom: 20, backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
            <View style={{ position: 'absolute', top: -20, right: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: C.amberGlow, pointerEvents: 'none' }} />
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Sparkles size={12} color={C.amberDark} strokeWidth={2} />
                <Text style={{ fontSize: 10, color: C.amberDark, fontWeight: '700', letterSpacing: 0.5 }}>TAKES 2 MINUTES</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, lineHeight: 20 }}>
                New space? Document its baseline condition for the next handover
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/move-in')}
              style={{ backgroundColor: C.amber, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 }}
            >
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#0C0A07' }}>Document Baseline</Text>
            </Pressable>
          </View>
        )}

        {/* ── Quick actions ─────────────────────────────────── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
          {[
            { icon: hasBaseline ? CheckCircle2 : ShieldCheck, label: 'Baseline', onPress: () => router.push('/move-in') },
            { icon: PlusCircle, label: 'New Handover', onPress: () => router.push('/new-case') },
            { icon: FileText,   label: 'Documents', onPress: () => router.push('/(tabs)/history') },
            { icon: Scale,      label: 'Policy Info', onPress: () => router.push('/(tabs)/profile') },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <Pressable key={i} onPress={a.onPress} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={17} color={C.amberDark} strokeWidth={2} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: C.ink2 }}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Active case ──────────────────────────────────── */}
        {activeCase && (
          <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Active Handover</Text>
              <Pressable onPress={() => router.push('/(tabs)/history')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 12, color: C.amberDark, fontWeight: '700' }}>See All</Text>
                <ChevronRight size={13} color={C.amberDark} strokeWidth={2.5} />
              </Pressable>
            </View>

            <Pressable onPress={() => router.push('/results')} style={{ backgroundColor: C.amber, borderRadius: 20, padding: 18, position: 'relative', overflow: 'hidden' }}>
              <View style={{ position: 'absolute', bottom: -30, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(0,0,0,0.06)', pointerEvents: 'none' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#0C0A07' }}>{activeCase.items[0]?.charAt(0) ?? 'H'}</Text>
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#0C0A07' }}>{activeCase.id}</Text>
                    <Text style={{ fontSize: 11, color: 'rgba(12,10,7,0.6)', fontWeight: '600' }} numberOfLines={1}>{activeCase.items.join(' + ') || 'Handover'}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#0C0A07' }}>{statusBadge(activeCase.needsDisputeResolution).label}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Clock size={13} color="#0C0A07" strokeWidth={2.5} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#0C0A07' }}>Filed {shortDate(activeCase.createdAt)} · ฿{activeCase.totalDadResponsibility.toLocaleString()} DAD responsibility</Text>
              </View>
            </Pressable>
          </View>
        )}

        {/* ── Item categories ─────────────────────────────── */}
        <View style={{ marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Item Categories</Text>
            <Pressable onPress={() => router.push('/new-case')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Text style={{ fontSize: 12, color: C.amberDark, fontWeight: '700' }}>See All</Text>
              <ChevronRight size={13} color={C.amberDark} strokeWidth={2.5} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
            {CATEGORIES.map(c => {
              const Icon = c.icon;
              return (
                <Pressable key={c.key} onPress={() => router.push('/new-case')} style={{ alignItems: 'center', gap: 7, width: 64 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border }}>
                    <Icon size={22} color={C.amberDark} strokeWidth={1.75} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2, textAlign: 'center' }}>{c.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Recent handovers list ─────────────────────────── */}
        <View style={{ paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>Recent Handovers</Text>
            {cases.length > 0 && (
              <Pressable onPress={() => router.push('/(tabs)/history')} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 12, color: C.amberDark, fontWeight: '700' }}>See All</Text>
                <ChevronRight size={13} color={C.amberDark} strokeWidth={2.5} />
              </Pressable>
            )}
          </View>

          {cases.length === 0 ? (
            <Pressable onPress={() => router.push('/new-case')}
              style={{ alignItems: 'center', gap: 6, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', paddingVertical: 28, paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink2 }}>No handovers yet</Text>
              <Text style={{ fontSize: 12, color: C.ink3, textAlign: 'center' }}>Handovers appear here once you run the pipeline.</Text>
            </Pressable>
          ) : cases.slice(0, 5).map(c => {
            const v = statusBadge(c.needsDisputeResolution);
            return (
              <Pressable key={c.id} onPress={() => router.push('/(tabs)/history')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
                <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={18} color={C.amberDark} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }} numberOfLines={1}>{c.items.join(' + ') || 'Handover'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                    <Text style={{ fontSize: 11, color: C.ink3 }}>{c.id} · {shortDate(c.createdAt)}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink }}>฿{c.totalEstimatedCost.toLocaleString()}</Text>
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
