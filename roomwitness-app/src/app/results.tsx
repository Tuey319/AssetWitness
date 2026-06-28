import { router } from 'expo-router';
import { AlertTriangle, CheckCircle, FileText, HelpCircle, Scale, TriangleAlert } from 'lucide-react-native';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClaimCard } from '@/components/ClaimCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/lib/store';

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-b border-separator-opaque">
      <Text className="text-label-secondary text-sm">{label}</Text>
      <Text className="text-navy font-semibold text-sm">{value}</Text>
    </View>
  );
}

export default function ResultsScreen() {
  const result = useStore((s) => s.result);

  if (!result) {
    return (
      <SafeAreaView className="flex-1 bg-bg items-center justify-center px-6">
        <Text className="text-label-secondary text-center mb-4">ไม่พบผลลัพธ์</Text>
        <TouchableOpacity onPress={() => router.replace('/')} className="bg-primary rounded-xl px-6 py-3">
          <Text className="text-white font-semibold">กลับหน้าแรก</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { contract_summary: cs, unfair_clauses, pdf_filename, routing,
    total_claimed_thb, total_unlawful_thb, case_summary_th, case_summary_en } = result;

  const recoverableTotal = result.claims
    .filter((c) => c.legal.classification !== 'LAWFUL')
    .reduce((s, c) => s + c.claim.amount_thb, 0);

  const unlawfulCount = result.claims.filter((c) => c.legal.classification === 'UNLAWFUL').length;
  const disputedCount = result.claims.filter((c) => c.legal.classification === 'DISPUTED').length;
  const lawfulCount   = result.claims.filter((c) => c.legal.classification === 'LAWFUL').length;
  const pct = total_claimed_thb ? Math.round(total_unlawful_thb / total_claimed_thb * 100) : 0;

  const heroColor = unlawfulCount > 0 ? 'bg-unlawful' : disputedCount > 0 ? 'bg-disputed' : 'bg-lawful';

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────── */}
        <View className={`${heroColor} rounded-2xl p-5 mb-4 mt-2`}>
          <Text className="text-white text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
            ผลการวิเคราะห์ · Analysis Result
          </Text>
          <Text className="text-white font-bold text-2xl leading-tight">
            {unlawfulCount > 0 ? 'พบการเรียกร้องผิดกฎหมาย' :
             disputedCount > 0 ? 'พบรายการที่โต้แย้งได้' : 'ทุกรายการถูกกฎหมาย'}
          </Text>
          <View className="flex-row gap-3 mt-4">
            <View className="flex-1 bg-white/20 rounded-xl p-3">
              <Text className="text-white text-xs opacity-70">Total claimed</Text>
              <Text className="text-white font-bold text-xl">฿{(total_claimed_thb || recoverableTotal).toLocaleString()}</Text>
            </View>
            <View className="flex-1 bg-white/20 rounded-xl p-3">
              <Text className="text-white text-xs opacity-70">Unlawful ({pct}%)</Text>
              <Text className="text-white font-bold text-xl">฿{(total_unlawful_thb || recoverableTotal).toLocaleString()}</Text>
              <Text className="text-white text-xs opacity-60 mt-0.5">Route: {routing || 'BOTH'}</Text>
            </View>
          </View>
        </View>

        {/* ── Verdict chips ─────────────────────────── */}
        <View className="flex-row gap-2 mb-4 flex-wrap">
          {unlawfulCount > 0 && (
            <View className="flex-row items-center gap-1.5 bg-unlawful-soft rounded-xl px-3 py-2">
              <AlertTriangle size={13} color="#FF3B30" strokeWidth={2} />
              <Text className="text-unlawful-dark text-xs font-semibold">{unlawfulCount} ผิดกฎหมาย · Unlawful</Text>
            </View>
          )}
          {disputedCount > 0 && (
            <View className="flex-row items-center gap-1.5 bg-disputed-soft rounded-xl px-3 py-2">
              <HelpCircle size={13} color="#FF9500" strokeWidth={2} />
              <Text className="text-disputed-dark text-xs font-semibold">{disputedCount} โต้แย้งได้ · Disputed</Text>
            </View>
          )}
          {lawfulCount > 0 && (
            <View className="flex-row items-center gap-1.5 bg-lawful-soft rounded-xl px-3 py-2">
              <CheckCircle size={13} color="#34C759" strokeWidth={2} />
              <Text className="text-lawful-dark text-xs font-semibold">{lawfulCount} ถูกกฎหมาย · Lawful</Text>
            </View>
          )}
        </View>

        {/* ── Agent 02 — Contract Parser ─────────────── */}
        <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
          <View className="flex-row items-center gap-2 mb-3">
            <FileText size={16} color="#007AFF" strokeWidth={1.75} />
            <Text className="text-navy font-bold text-sm">Contract Parser</Text>
            {pdf_filename && (
              <View className="bg-primary-soft rounded-md px-2 py-0.5 ml-auto">
                <Text className="text-primary text-xs" numberOfLines={1}>{pdf_filename}</Text>
              </View>
            )}
          </View>

          {cs ? (
            <>
              <InfoRow label="Deposit" value={`฿${cs.deposit_amount_thb.toLocaleString()} (${cs.deposit_months} mo)`} />
              <InfoRow label="Period" value={cs.lease_start && cs.lease_end ? `${cs.lease_start} → ${cs.lease_end}` : '—'} />
              <InfoRow label="Notice" value={`${cs.notice_period_days} days`} />
              <InfoRow label="Rent" value={`฿${cs.monthly_rent_thb.toLocaleString()}/mo`} />
            </>
          ) : (
            <Text className="text-label-tertiary text-sm">No contract provided</Text>
          )}

          {/* Void clauses */}
          {unfair_clauses.length > 0 && (
            <View className="mt-3 bg-unlawful-soft rounded-xl p-3">
              <View className="flex-row items-center gap-1.5 mb-2">
                <TriangleAlert size={14} color="#FF3B30" strokeWidth={2} />
                <Text className="text-unlawful-dark font-bold text-sm">
                  Void clauses found ({unfair_clauses.length})
                </Text>
              </View>
              {unfair_clauses.map((c, i) => (
                <View key={i} className="mb-2">
                  <Text className="text-unlawful text-xs italic" numberOfLines={2}>"{c.clause_text}"</Text>
                  <Text className="text-unlawful-dark text-xs mt-0.5">{c.reason_void}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Agent 03 — Legal Reasoning ─────────────── */}
        <View className="mb-2">
          <View className="flex-row items-center gap-2 mb-3">
            <Scale size={16} color="#007AFF" strokeWidth={1.75} />
            <Text className="text-navy font-bold text-sm">Legal Reasoning · All claims</Text>
          </View>
          {result.claims.map((item, i) => (
            <ClaimCard key={i} item={item} />
          ))}
        </View>

        {/* ── Case summary ──────────────────────────── */}
        {(case_summary_th || case_summary_en) && (
          <View className="bg-bg-secondary rounded-2xl p-4 mb-4">
            <Text className="text-navy font-bold text-sm mb-2">Case Summary</Text>
            {case_summary_th && (
              <Text className="text-navy text-sm leading-5 mb-2">{case_summary_th}</Text>
            )}
            {case_summary_en && (
              <Text className="text-label-secondary text-sm leading-5 italic">{case_summary_en}</Text>
            )}
          </View>
        )}

        <PrimaryButton title="Generate Documents →" onPress={() => router.push('/details')} />
      </ScrollView>
    </SafeAreaView>
  );
}
