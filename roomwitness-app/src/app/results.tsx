import { router } from 'expo-router';
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
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-6">
        <Text className="text-gray-500 text-center">ไม่พบผลลัพธ์ · No results</Text>
        <TouchableOpacity onPress={() => router.replace('/')} className="mt-4">
          <Text className="text-primary font-semibold">← กลับหน้าแรก</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Client-side recoverable estimate
  const recoverableTotal = result.claims
    .filter((c) => c.legal.classification !== 'LAWFUL')
    .reduce((sum, c) => sum + c.claim.amount_thb, 0);

  const totalCharged = result.claims.reduce((sum, c) => sum + c.claim.amount_thb, 0);

  const unlawfulCount = result.claims.filter((c) => c.legal.classification === 'UNLAWFUL').length;
  const disputedCount = result.claims.filter((c) => c.legal.classification === 'DISPUTED').length;

  const bannerClass =
    unlawfulCount > 0 ? 'bg-unlawful-soft border-unlawful' : disputedCount > 0 ? 'bg-disputed-soft border-disputed' : 'bg-lawful-soft border-lawful';
  const bannerTextClass =
    unlawfulCount > 0 ? 'text-unlawful' : disputedCount > 0 ? 'text-disputed' : 'text-lawful';
  const bannerLabel =
    unlawfulCount > 0
      ? `${unlawfulCount} รายการผิดกฎหมาย · Unlawful`
      : disputedCount > 0
      ? `${disputedCount} รายการโต้แย้งได้ · Disputed`
      : 'ทุกรายการถูกกฎหมาย · All lawful';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <NavHeader step={3} label="ผลลัพธ์ · Results" />
      <ScrollView className="flex-1 px-4">
        {/* Verdict banner */}
        <View className={`rounded-lg border p-4 mb-4 ${bannerClass}`}>
          <Text className={`font-bold text-base ${bannerTextClass}`}>ผลการวิเคราะห์</Text>
          <Text className={`text-sm ${bannerTextClass}`}>{bannerLabel}</Text>
        </View>

        {/* Recoverable estimate */}
        <View className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-gray-700 font-semibold">ยอดที่อาจคืนได้</Text>
            <View className="bg-yellow-100 px-2 py-0.5 rounded-sm">
              <Text className="text-yellow-700 text-xs font-semibold">ประมาณการ / estimate</Text>
            </View>
          </View>
          <Text className="text-2xl font-bold text-gray-900">
            ฿{recoverableTotal.toLocaleString()}{' '}
            <Text className="text-gray-400 text-base font-normal">/ ฿{totalCharged.toLocaleString()}</Text>
          </Text>
          <Text className="text-gray-400 text-xs mt-1">
            * คำนวณจากรายการ UNLAWFUL + DISPUTED เท่านั้น ไม่ใช่ตัวเลขจากระบบ
          </Text>
        </View>

        {/* Evidence pills */}
        {result.evidence_summary && (
          <View className="mb-4">
            <Text className="text-gray-700 font-semibold mb-2">หลักฐานที่พบ · Evidence found</Text>
            <View className="flex-row flex-wrap gap-2">
              {result.evidence_summary.platforms.map((p, i) => (
                <View key={i} className="bg-primary-soft rounded-sm px-2 py-1">
                  <Text className="text-primary text-xs font-semibold">{p}</Text>
                </View>
              ))}
              {result.evidence_summary.landlord_promises.map((p, i) => (
                <View key={`lp${i}`} className="bg-gray-100 rounded-sm px-2 py-1 max-w-[200px]">
                  <Text className="text-gray-600 text-xs" numberOfLines={1}>{p}</Text>
                </View>
              ))}
              {result.evidence_summary.deposit_mentions.map((d, i) => (
                <View key={`dm${i}`} className="bg-disputed-soft rounded-sm px-2 py-1 max-w-[200px]">
                  <Text className="text-disputed text-xs" numberOfLines={1}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Claim cards */}
        <Text className="text-gray-700 font-semibold mb-2">รายการทั้งหมด · All claims</Text>
        {result.claims.map((item, i) => (
          <ClaimCard key={i} item={item} />
        ))}

        <View className="pb-8 mt-2">
          <PrimaryButton title="เอกสาร / Documents →" onPress={() => router.push('/details')} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
