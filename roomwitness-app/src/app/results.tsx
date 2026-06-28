import { router } from 'expo-router';
import { AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClaimCard } from '@/components/ClaimCard';
import { NavHeader } from '@/components/NavHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/lib/store';

export default function ResultsScreen() {
  const result = useStore((s) => s.result);

  if (!result) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-label-secondary text-center mb-4">ไม่พบผลลัพธ์</Text>
        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="bg-primary rounded-xl px-6 py-3"
        >
          <Text className="text-white font-semibold">กลับหน้าแรก</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const totalCharged    = result.claims.reduce((s, c) => s + c.claim.amount_thb, 0);
  const recoverableTotal = result.claims
    .filter((c) => c.legal.classification !== 'LAWFUL')
    .reduce((s, c) => s + c.claim.amount_thb, 0);

  const unlawfulCount = result.claims.filter((c) => c.legal.classification === 'UNLAWFUL').length;
  const disputedCount = result.claims.filter((c) => c.legal.classification === 'DISPUTED').length;
  const lawfulCount   = result.claims.filter((c) => c.legal.classification === 'LAWFUL').length;

  const heroColor   = unlawfulCount > 0 ? 'bg-unlawful' : disputedCount > 0 ? 'bg-disputed' : 'bg-lawful';
  const heroLabel   = unlawfulCount > 0 ? 'พบการเรียกร้องผิดกฎหมาย' : disputedCount > 0 ? 'พบรายการที่โต้แย้งได้' : 'ทุกรายการถูกกฎหมาย';
  const heroSub     = unlawfulCount > 0 ? `${unlawfulCount} รายการผิดกฎหมาย` : disputedCount > 0 ? `${disputedCount} รายการโต้แย้งได้` : 'ไม่พบปัญหา';

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <NavHeader step={3} label="ผลการวิเคราะห์" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero card */}
        <View className={`${heroColor} rounded-2xl p-5 mb-4`}>
          <Text className="text-white text-xs font-semibold uppercase tracking-widest mb-1 opacity-80">
            ผลการวิเคราะห์
          </Text>
          <Text className="text-white font-bold text-2xl leading-tight">{heroLabel}</Text>
          <Text className="text-white opacity-80 text-sm mt-0.5">{heroSub}</Text>

          {/* Stats row */}
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1 bg-white/20 rounded-xl p-3">
              <Text className="text-white text-xs opacity-70">เรียกร้องทั้งหมด</Text>
              <Text className="text-white font-bold text-xl">฿{totalCharged.toLocaleString()}</Text>
            </View>
            <View className="flex-1 bg-white/20 rounded-xl p-3">
              <Text className="text-white text-xs opacity-70">อาจคืนได้</Text>
              <Text className="text-white font-bold text-xl">฿{recoverableTotal.toLocaleString()}</Text>
              <Text className="text-white text-xs opacity-60 mt-0.5">ประมาณการ</Text>
            </View>
          </View>
        </View>

        {/* Verdict summary chips */}
        <View className="flex-row gap-2 mb-4">
          {unlawfulCount > 0 && (
            <View className="flex-row items-center gap-1.5 bg-unlawful-soft rounded-xl px-3 py-2 flex-1">
              <AlertTriangle size={14} color="#FF3B30" strokeWidth={2} />
              <Text className="text-unlawful-dark text-xs font-semibold">{unlawfulCount} ผิดกฎหมาย</Text>
            </View>
          )}
          {disputedCount > 0 && (
            <View className="flex-row items-center gap-1.5 bg-disputed-soft rounded-xl px-3 py-2 flex-1">
              <HelpCircle size={14} color="#FF9500" strokeWidth={2} />
              <Text className="text-disputed-dark text-xs font-semibold">{disputedCount} โต้แย้งได้</Text>
            </View>
          )}
          {lawfulCount > 0 && (
            <View className="flex-row items-center gap-1.5 bg-lawful-soft rounded-xl px-3 py-2 flex-1">
              <CheckCircle size={14} color="#34C759" strokeWidth={2} />
              <Text className="text-lawful-dark text-xs font-semibold">{lawfulCount} ถูกกฎหมาย</Text>
            </View>
          )}
        </View>

        {/* Evidence pills */}
        {result.evidence_summary && result.evidence_summary.platforms.length > 0 && (
          <View className="bg-bg-secondary rounded-xl p-4 mb-4">
            <Text className="text-navy font-semibold text-sm mb-2">หลักฐานที่พบ</Text>
            <View className="flex-row flex-wrap gap-2">
              {result.evidence_summary.platforms.map((p, i) => (
                <View key={i} className="bg-primary-soft rounded-md px-2.5 py-1">
                  <Text className="text-primary text-xs font-semibold">{p}</Text>
                </View>
              ))}
              {result.evidence_summary.deposit_mentions.map((d, i) => (
                <View key={`d${i}`} className="bg-disputed-soft rounded-md px-2.5 py-1 max-w-[180px]">
                  <Text className="text-disputed-dark text-xs" numberOfLines={1}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Claims */}
        <Text className="text-label text-sm font-semibold mb-3 uppercase tracking-wide">
          รายการทั้งหมด
        </Text>
        {result.claims.map((item, i) => (
          <ClaimCard key={i} item={item} />
        ))}

        <View className="mt-2">
          <PrimaryButton title="ขั้นตอนต่อไป — สร้างเอกสาร →" onPress={() => router.push('/details')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
