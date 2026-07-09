import { router } from 'expo-router';
import { Clock, Plus, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '@/lib/theme';
import { useStore } from '@/lib/store';

function fullDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const FILTERS = ['All', 'Unlawful', 'Disputed', 'Lawful'] as const;
type Filter = typeof FILTERS[number];

const VCFG = {
  UNLAWFUL: { label: 'Unlawful', dot: '#F87171', text: '#F87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)' },
  DISPUTED: { label: 'Disputed', dot: '#FBBF24', text: '#FBBF24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.25)'  },
  LAWFUL:   { label: 'Lawful',   dot: '#34D399', text: '#34D399', bg: 'rgba(52,211,153,0.10)',  border: 'rgba(52,211,153,0.25)'  },
};

// Light-mode overrides for verdict colors (always vibrant, theme-independent)
const VCFG_LIGHT = {
  UNLAWFUL: { label: 'Unlawful', dot: '#EF4444', text: '#B91C1C', bg: '#FEF2F2', border: 'rgba(239,68,68,0.25)' },
  DISPUTED: { label: 'Disputed', dot: '#D97706', text: '#92400E', bg: '#FFFBEB', border: 'rgba(217,119,6,0.25)'  },
  LAWFUL:   { label: 'Lawful',   dot: '#059669', text: '#065F46', bg: '#ECFDF5', border: 'rgba(5,150,105,0.25)' },
};

export default function HistoryScreen() {
  const theme  = useStore(s => s.theme);
  const C      = getColors(theme);
  const isDark = theme === 'dark';
  const CASES  = useStore(s => s.cases);

  const [q, setQ]           = useState('');
  const [filter, setFilter] = useState<Filter>('All');

  const vcfg = isDark ? VCFG : VCFG_LIGHT;

  const filtered = CASES.filter(c => {
    const matchesFilter = filter === 'All' || c.verdict === filter.toUpperCase();
    const matchesQuery  = !q.trim() || c.id.toLowerCase().includes(q.toLowerCase()) || c.items.some(i => i.toLowerCase().includes(q.toLowerCase()));
    return matchesFilter && matchesQuery;
  });

  const totalRecovered = CASES.reduce((s, c) => s + c.totalRecoverable, 0);
  const winRate = CASES.length > 0 ? Math.round(CASES.filter(c => c.verdict !== 'LAWFUL').length / CASES.length * 100) : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* ── Header ──────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, backgroundColor: C.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ fontSize: 32, fontWeight: '900', color: C.ink, letterSpacing: -1.5 }}>History</Text>
          <Pressable
            onPress={() => router.push('/new-case')}
            style={{ backgroundColor: C.amber, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}
            hitSlop={8}
          >
            <Plus size={20} color="#0C0A07" strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Search */}
        <View style={{ backgroundColor: C.surface, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, borderWidth: 1, borderColor: C.border, height: 48, marginBottom: 12 }}>
          <Search size={16} color={C.ink3} strokeWidth={2} />
          <TextInput
            value={q} onChangeText={setQ}
            placeholder="Search cases or items…"
            placeholderTextColor={C.ink3}
            style={{ flex: 1, fontSize: 15, color: C.ink }}
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={12}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: C.surface2, alignItems: 'center', justifyContent: 'center' }}>
                <X size={10} color={C.ink3} strokeWidth={2.5} />
              </View>
            </Pressable>
          )}
        </View>

        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map(f => {
            const active = filter === f;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1, backgroundColor: active ? C.amber : C.surface, borderColor: active ? C.amber : C.border }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: active ? '#0C0A07' : C.ink2 }}>{f}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Total cases', v: String(CASES.length) },
            { l: 'Total recovered', v: `฿${totalRecovered.toLocaleString()}` },
            { l: 'Win rate', v: `${winRate}%` },
          ].map((s, i) => (
            <View key={i} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>{s.l}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: C.amberDark, letterSpacing: -0.5 }}>{s.v}</Text>
            </View>
          ))}
        </View>

        {/* Cases */}
        {filtered.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 56 }}>
            <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
              <Search size={28} color={C.ink3} strokeWidth={1.5} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 6 }}>No cases found</Text>
            <Text style={{ fontSize: 14, color: C.ink3, textAlign: 'center', lineHeight: 20 }}>
              {filter !== 'All' ? `No ${filter.toLowerCase()} cases yet` : 'Try a different search term'}
            </Text>
            <Pressable
              onPress={() => router.push('/new-case')}
              style={{ marginTop: 20, backgroundColor: C.amber, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 999 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0C0A07' }}>Start your first case →</Text>
            </Pressable>
          </View>
        ) : (
          filtered.map(c => {
            const v = vcfg[c.verdict];
            return (
              <Pressable key={c.id} onPress={() => router.push('/results')} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
                {/* Top */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{c.id}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
                      <Clock size={11} color={C.ink3} strokeWidth={2} />
                      <Text style={{ fontSize: 12, color: C.ink3 }}>{fullDate(c.createdAt)}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: v.bg, borderRadius: 999, borderWidth: 1, borderColor: v.border }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: v.dot }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: v.text }}>{v.label}</Text>
                  </View>
                </View>

                {/* Items */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                  {c.items.map((item, i) => (
                    <View key={i} style={{ backgroundColor: C.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: C.border2 }}>
                      <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '500' }}>{item}</Text>
                    </View>
                  ))}
                </View>

                {/* Amounts */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border2 }}>
                  <Text style={{ fontSize: 13, color: C.ink2 }}>
                    Charged: <Text style={{ fontWeight: '800', color: C.ink }}>฿{c.totalCharged.toLocaleString()}</Text>
                  </Text>
                  {c.totalRecoverable > 0 && (
                    <View style={{ backgroundColor: isDark ? 'rgba(52,211,153,0.10)' : '#ECFDF5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: C.ok }}>+฿{c.totalRecoverable.toLocaleString()}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
