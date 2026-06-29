import { Clock, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = { bg: '#0C0A07', surface: '#181410', surface2: '#221C10', ink: '#FAF8F5', ink2: 'rgba(250,248,245,0.55)', ink3: 'rgba(250,248,245,0.30)', amber: '#F59E0B', amberSoft: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.14)', border2: 'rgba(250,248,245,0.06)', danger: '#F87171', dangerBg: 'rgba(248,113,113,0.10)', dangerBorder: 'rgba(248,113,113,0.25)', warn: '#FBBF24', warnBg: 'rgba(251,191,36,0.10)', ok: '#34D399', okBg: 'rgba(52,211,153,0.10)', okBorder: 'rgba(52,211,153,0.25)' };

const CASES = [
  { id: 'RW-2026-001', date: '28 Jun 2026', items: ['Wall paint', 'Floor scratch'], total: 8000, unlawful: 5000, verdict: 'UNLAWFUL' as const },
  { id: 'RW-2026-002', date: '15 Jun 2026', items: ['Sofa', 'Coffee table'], total: 30000, unlawful: 18000, verdict: 'DISPUTED' as const },
  { id: 'RW-2026-003', date: '2 Jun 2026', items: ['Deep cleaning'], total: 2000, unlawful: 0, verdict: 'LAWFUL' as const },
];

const VCFG = {
  UNLAWFUL: { bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)', text: '#F87171', dot: '#F87171', label: 'Unlawful' },
  DISPUTED: { bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.25)',  text: '#FBBF24', dot: '#FBBF24', label: 'Disputed' },
  LAWFUL:   { bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.25)',  text: '#34D399', dot: '#34D399', label: 'Lawful'   },
};

export default function HistoryScreen() {
  const [q, setQ] = useState('');
  const filtered = CASES.filter(c => !q.trim() || c.id.toLowerCase().includes(q.toLowerCase()) || c.items.some(i => i.toLowerCase().includes(q.toLowerCase())));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, backgroundColor: C.bg }}>
        {/* Ambient glow */}
        <View style={{ position: 'absolute', top: -30, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(245,158,11,0.04)' }} />

        <Text style={{ fontSize: 32, fontWeight: '900', color: C.ink, letterSpacing: -1.5, marginBottom: 16 }}>History</Text>

        <View style={{ backgroundColor: C.surface, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: C.border, height: 48 }}>
          <Search size={16} color={C.ink3} strokeWidth={2} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search cases or items…" placeholderTextColor={C.ink3}
            style={{ flex: 1, fontSize: 15, color: C.ink }} />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={12}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
                <X size={10} color={C.ink3} strokeWidth={2.5} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[{ l: 'Total cases', v: CASES.length }, { l: 'Recovered', v: `฿${CASES.reduce((s,c)=>s+c.unlawful,0).toLocaleString()}` }].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>{s.l}</Text>
              <Text style={{ fontSize: 26, fontWeight: '900', color: C.amber, letterSpacing: -1 }}>{s.v}</Text>
            </View>
          ))}
        </View>

        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 64 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
              <Search size={28} color={C.ink3} strokeWidth={1.5} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 6 }}>No cases found</Text>
            <Text style={{ fontSize: 14, color: C.ink3 }}>Try a different search term</Text>
          </View>
        ) : (
          filtered.map(c => {
            const v = VCFG[c.verdict];
            return (
              <Pressable key={c.id} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{c.id}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Clock size={11} color={C.ink3} strokeWidth={2} />
                      <Text style={{ fontSize: 12, color: C.ink3 }}>{c.date}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: v.bg, borderRadius: 999, borderWidth: 1, borderColor: v.border }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: v.dot }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: v.text }}>{v.label}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {c.items.map((item, i) => (
                    <View key={i} style={{ backgroundColor: C.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border2 }}>
                      <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '500' }}>{item}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border2 }}>
                  <Text style={{ fontSize: 13, color: C.ink2 }}>Charged: <Text style={{ fontWeight: '800', color: C.ink }}>฿{c.total.toLocaleString()}</Text></Text>
                  {c.unlawful > 0 && <Text style={{ fontSize: 13, fontWeight: '800', color: C.ok }}>+฿{c.unlawful.toLocaleString()} recoverable</Text>}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
