import { router } from 'expo-router';
import { ChevronDown, ChevronUp, FileText, Scale, TriangleAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/lib/store';

const C = {
  bg:       '#F4F5F7',
  card:     '#FFFFFF',
  ink:      '#111827',
  ink2:     '#6B7280',
  ink3:     '#9CA3AF',
  border:   '#E5E7EB',
  border2:  '#F3F4F6',
  accent:   '#2563EB',
  danger:   '#EF4444',
  dangerBg: '#FEF2F2',
  dangerInk:'#7F1D1D',
  warn:     '#F59E0B',
  warnBg:   '#FFFBEB',
  warnInk:  '#78350F',
  ok:       '#10B981',
  okBg:     '#ECFDF5',
  okInk:    '#064E3B',
};

function VerdictBadge({ v }: { v: 'LAWFUL' | 'DISPUTED' | 'UNLAWFUL' }) {
  const cfg = {
    LAWFUL:   { bg: C.okBg,     text: C.okInk,     dot: C.ok,     label: 'Lawful'   },
    DISPUTED: { bg: C.warnBg,   text: C.warnInk,   dot: C.warn,   label: 'Disputed' },
    UNLAWFUL: { bg: C.dangerBg, text: C.dangerInk, dot: C.danger, label: 'Unlawful' },
  }[v];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: cfg.bg, borderRadius: 999 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.dot }} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.text }}>{cfg.label}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
      <Text style={{ fontSize: 14, color: C.ink2 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{value}</Text>
    </View>
  );
}

function ClaimRow({ item }: { item: any }) {
  const [open, setOpen] = useState(false);
  const { claim, cv, legal } = item;
  const borderColor = legal.classification === 'UNLAWFUL' ? C.danger : legal.classification === 'DISPUTED' ? C.warn : C.ok;

  return (
    <View style={{
      backgroundColor: C.card, borderRadius: 18, marginBottom: 12,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 4, borderLeftColor: borderColor,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{claim.item}</Text>
          {claim.description ? (
            <Text style={{ fontSize: 12, color: C.ink2, marginTop: 3 }} numberOfLines={2}>{claim.description}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>฿{claim.amount_thb.toLocaleString()}</Text>
          <VerdictBadge v={legal.classification} />
        </View>
      </View>

      {/* Thai summary */}
      <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.ink, borderRadius: 12, padding: 14 }}>
        <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>{legal.summary_th}</Text>
      </View>

      {/* Citations */}
      {legal.legal_basis?.length > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {legal.legal_basis.map((b: any, i: number) => (
            <View key={i} style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, color: C.accent, fontWeight: '600' }}>{b.section}</Text>
            </View>
          ))}
        </View>
      )}

      {/* CV strip */}
      {cv?.supports_landlord_claim && (
        <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: cv.supports_landlord_claim === 'NO' ? C.ok : cv.supports_landlord_claim === 'YES' ? C.danger : C.warn }} />
          <Text style={{ fontSize: 12, color: C.ink2 }}>
            Photo verdict: <Text style={{ fontWeight: '600', color: C.ink }}>
              {cv.supports_landlord_claim === 'YES' ? 'Supports claim' : cv.supports_landlord_claim === 'NO' ? 'Does not support' : 'Partial'}
            </Text>{' · '}{Math.round((cv.confidence ?? 0) * 100)}% confidence
          </Text>
        </View>
      )}

      {/* Toggle */}
      <Pressable onPress={() => setOpen(v => !v)} hitSlop={12}
        style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {open ? <ChevronUp size={14} color={C.accent} strokeWidth={2.5} /> : <ChevronDown size={14} color={C.accent} strokeWidth={2.5} />}
        <Text style={{ fontSize: 13, color: C.accent, fontWeight: '600' }}>
          {open ? 'Hide reasoning' : 'View full reasoning'}
        </Text>
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8, borderTopWidth: 1, borderTopColor: C.border2, paddingTop: 12 }}>
          {[
            { k: 'pre_existence', th: 'ก่อนเข้าอยู่', en: 'Pre-existence' },
            { k: 'wear_and_tear', th: 'การสึกหรอ', en: 'Wear & tear' },
            { k: 'proportionality', th: 'สัดส่วน', en: 'Proportionality' },
            { k: 'contractual_clarity', th: 'สัญญา', en: 'Contract' },
          ].map(({ k, th, en }) => (
            <View key={k} style={{ backgroundColor: C.bg, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2, marginBottom: 4 }}>{th} · {en}</Text>
              <Text style={{ fontSize: 13, color: C.ink, lineHeight: 19 }}>{legal.dimensions?.[k]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function ResultsScreen() {
  const result = useStore(s => s.result);

  if (!result) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ color: C.ink2, marginBottom: 16, fontSize: 16 }}>No results found</Text>
        <TouchableOpacity onPress={() => router.replace('/')}
          style={{ backgroundColor: C.ink, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Start new case</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const { contract_summary: cs, unfair_clauses = [], total_claimed_thb = 0, total_unlawful_thb = 0, routing = '', case_summary_th, case_summary_en } = result as any;
  const recov = result.claims.filter(c => c.legal.classification !== 'LAWFUL').reduce((s, c) => s + c.claim.amount_thb, 0);
  const pct = total_claimed_thb > 0 ? Math.round(total_unlawful_thb / total_claimed_thb * 100) : 0;
  const unlawful = result.claims.filter(c => c.legal.classification === 'UNLAWFUL').length;
  const disputed = result.claims.filter(c => c.legal.classification === 'DISPUTED').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────── */}
        <View style={{ backgroundColor: C.ink, borderRadius: 24, padding: 24, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 }}>ANALYSIS RESULT</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 20, letterSpacing: -0.5 }}>
            {unlawful > 0 ? 'Unlawful deductions found' : disputed > 0 ? 'Disputed deductions found' : 'All deductions are lawful'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 6 }}>TOTAL CLAIMED</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>฿{(total_claimed_thb || recov).toLocaleString()}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 11, color: 'rgba(16,185,129,0.7)', fontWeight: '600', marginBottom: 6 }}>UNLAWFUL ({pct}%)</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>฿{(total_unlawful_thb || recov).toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Route: {routing || 'BOTH'}</Text>
            </View>
          </View>
        </View>

        {/* ── Contract Parser ─────────────────── */}
        {cs && (
          <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} color={C.accent} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>Contract Parser</Text>
            </View>
            <InfoRow label="Deposit" value={`฿${cs.deposit_amount_thb?.toLocaleString()} (${cs.deposit_months} mo)`} />
            <InfoRow label="Lease period" value={cs.lease_start && cs.lease_end ? `${cs.lease_start} → ${cs.lease_end}` : '—'} />
            <InfoRow label="Notice" value={`${cs.notice_period_days ?? 30} days`} />
            <InfoRow label="Monthly rent" value={`฿${cs.monthly_rent_thb?.toLocaleString()}/mo`} />

            {unfair_clauses.length > 0 && (
              <View style={{ marginTop: 12, backgroundColor: C.dangerBg, borderRadius: 14, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <TriangleAlert size={14} color={C.danger} strokeWidth={2} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.dangerInk }}>Void clauses found ({unfair_clauses.length})</Text>
                </View>
                {unfair_clauses.map((c: any, i: number) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: C.danger, fontStyle: 'italic' }} numberOfLines={2}>"{c.clause_text}"</Text>
                    <Text style={{ fontSize: 12, color: C.dangerInk, marginTop: 2 }}>{c.reason_void}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Claims ─────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Scale size={16} color={C.ink2} strokeWidth={2} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink2, textTransform: 'uppercase', letterSpacing: 1 }}>Legal verdicts · All claims</Text>
        </View>
        {result.claims.map((item, i) => <ClaimRow key={i} item={item} />)}

        {/* ── Case summary ───────────────────── */}
        {(case_summary_th || case_summary_en) && (
          <View style={{ backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 12 }}>Case summary</Text>
            {case_summary_th && <Text style={{ fontSize: 14, color: C.ink, lineHeight: 22, marginBottom: 10 }}>{case_summary_th}</Text>}
            {case_summary_en && <Text style={{ fontSize: 13, color: C.ink2, lineHeight: 20, fontStyle: 'italic' }}>{case_summary_en}</Text>}
          </View>
        )}

        <Pressable
          onPress={() => router.push('/details')}
          style={{ backgroundColor: C.accent, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Generate documents →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
