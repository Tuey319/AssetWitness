import { Clock, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Mock case history — in production this would come from local storage or a server
const MOCK_CASES = [
  {
    id: 'RW-2026-001',
    date: '28 Jun 2026',
    items: ['สีผนัง', 'พื้น'],
    totalClaimed: 8000,
    unlawful: 5000,
    verdict: 'UNLAWFUL' as const,
  },
  {
    id: 'RW-2026-002',
    date: '15 Jun 2026',
    items: ['โซฟา', 'โต๊ะกาแฟ'],
    totalClaimed: 30000,
    unlawful: 18000,
    verdict: 'DISPUTED' as const,
  },
  {
    id: 'RW-2026-003',
    date: '2 Jun 2026',
    items: ['ทำความสะอาด'],
    totalClaimed: 2000,
    unlawful: 0,
    verdict: 'LAWFUL' as const,
  },
];

const VERDICT_CONFIG = {
  UNLAWFUL: { bg: 'bg-unlawful-soft', text: 'text-unlawful-dark', dot: 'bg-unlawful', label: 'ผิดกฎหมาย' },
  DISPUTED: { bg: 'bg-disputed-soft', text: 'text-disputed-dark', dot: 'bg-disputed', label: 'โต้แย้งได้' },
  LAWFUL:   { bg: 'bg-lawful-soft',   text: 'text-lawful-dark',   dot: 'bg-lawful',   label: 'ถูกกฎหมาย' },
} as const;

export default function HistoryScreen() {
  const [query, setQuery] = useState('');

  const filtered = MOCK_CASES.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return c.id.toLowerCase().includes(q) || c.items.some((i) => i.toLowerCase().includes(q));
  });

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2 bg-bg">
        <Text className="text-3xl font-bold text-navy mb-3">Case History</Text>

        {/* Search bar */}
        <View className="bg-bg-secondary rounded-xl flex-row items-center px-3 gap-2 border border-separator">
          <Search size={16} color="#8E8E93" strokeWidth={2} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by case ID or item..."
            placeholderTextColor="#C7C7CC"
            className="flex-1 py-3 text-navy text-sm"
            clearButtonMode="never"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <X size={14} color="#8E8E93" strokeWidth={2} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Search size={40} color="#C7C7CC" strokeWidth={1.5} />
            <Text className="text-label-secondary text-base font-semibold mt-4">No cases found</Text>
            <Text className="text-label-tertiary text-sm mt-1">Try a different search term</Text>
          </View>
        ) : (
          filtered.map((c) => {
            const cfg = VERDICT_CONFIG[c.verdict];
            return (
              <Pressable
                key={c.id}
                className="bg-bg-secondary rounded-2xl p-4 mb-3 border border-separator active:opacity-70"
              >
                {/* Top row */}
                <View className="flex-row items-start justify-between mb-2">
                  <View>
                    <Text className="text-navy font-bold text-sm">{c.id}</Text>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Clock size={11} color="#8E8E93" strokeWidth={2} />
                      <Text className="text-label-secondary text-xs">{c.date}</Text>
                    </View>
                  </View>
                  <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-md ${cfg.bg}`}>
                    <View className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                    <Text className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Items */}
                <View className="flex-row flex-wrap gap-1.5 mb-3">
                  {c.items.map((item, i) => (
                    <View key={i} className="bg-bg rounded-md px-2 py-0.5">
                      <Text className="text-label-secondary text-xs">{item}</Text>
                    </View>
                  ))}
                </View>

                {/* Amounts */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-label-secondary text-xs">
                    ถูกหัก ฿{c.totalClaimed.toLocaleString()}
                  </Text>
                  {c.unlawful > 0 && (
                    <Text className="text-unlawful text-xs font-semibold">
                      ผิดกฎหมาย ฿{c.unlawful.toLocaleString()}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}

        {/* Empty state hint */}
        {MOCK_CASES.length === 0 && (
          <View className="items-center py-16">
            <Clock size={44} color="#C7C7CC" strokeWidth={1.25} />
            <Text className="text-label-secondary text-base font-semibold mt-4">ยังไม่มีประวัติ</Text>
            <Text className="text-label-tertiary text-sm mt-1 text-center">
              เคสที่คุณวิเคราะห์จะแสดงที่นี่{'\n'}Your analyzed cases will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
