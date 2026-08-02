import { router } from 'expo-router';
import { ChevronDown, ChevronUp, FileText, Scale, TriangleAlert } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';
import type { HandoverAnalysis, HandoverItemResult, Responsibility } from '@/lib/types';

const RESPONSIBILITY_LABEL: Record<Responsibility, string> = {
  NORMAL_WEAR: 'Normal wear',
  OCCUPANT_RESPONSIBILITY: 'Occupant',
  DAD_RESPONSIBILITY: 'DAD',
  DISPUTED: 'Disputed',
};

function ResponsibilityBadge({ v }: { v: Responsibility }) {
  const C = getColors(useStore(s => s.theme));
  const cfg = {
    NORMAL_WEAR:             { bg: C.okBg,     text: C.ok,     dot: C.ok     },
    DAD_RESPONSIBILITY:      { bg: C.okBg,     text: C.ok,     dot: C.ok     },
    OCCUPANT_RESPONSIBILITY: { bg: C.dangerBg, text: C.danger, dot: C.danger },
    DISPUTED:                { bg: C.warnBg,   text: C.warn,   dot: C.warn   },
  }[v];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: cfg.bg, borderRadius: 999 }}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: cfg.dot }} />
      <Text style={{ fontSize: 12, fontWeight: '700', color: cfg.text }}>{RESPONSIBILITY_LABEL[v]}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const C = getColors(useStore(s => s.theme));
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
      <Text style={{ fontSize: 14, color: C.ink2 }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{value}</Text>
    </View>
  );
}

function ItemRow({ item }: { item: HandoverItemResult }) {
  const C = getColors(useStore(s => s.theme));
  const [open, setOpen] = useState(false);
  const { condition_item, condition, verdict } = item;
  const responsibility = verdict?.responsibility ?? 'DISPUTED';
  const borderColor = responsibility === 'OCCUPANT_RESPONSIBILITY' ? C.danger : responsibility === 'DISPUTED' ? C.warn : C.ok;

  return (
    <View style={{
      backgroundColor: C.surface, borderRadius: 18, marginBottom: 12,
      borderWidth: 1, borderColor: C.border,
      borderLeftWidth: 4, borderLeftColor: borderColor,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <View style={{ padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{condition_item.item}</Text>
          {condition_item.description ? (
            <Text style={{ fontSize: 12, color: C.ink2, marginTop: 3 }} numberOfLines={2}>{condition_item.description}</Text>
          ) : null}
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>฿{condition_item.estimated_cost_thb.toLocaleString()}</Text>
          <ResponsibilityBadge v={responsibility} />
        </View>
      </View>

      {/* Thai summary */}
      {verdict?.reasoning_th && (
        <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.ink, borderRadius: 12, padding: 14 }}>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', lineHeight: 20 }}>{verdict.reasoning_th}</Text>
        </View>
      )}

      {/* Citations */}
      {(verdict?.citations?.length ?? 0) > 0 && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {verdict!.citations.map((cite, i) => (
            <View key={i} style={{ backgroundColor: C.amberSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
              <Text style={{ fontSize: 11, color: C.amberDark, fontWeight: '600' }}>{cite}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Condition strip */}
      {condition && (
        <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: C.surface2, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: condition.verdict === 'NEW_DAMAGE' ? C.danger : condition.verdict === 'PRE_EXISTING' ? C.warn : C.ok }} />
          <Text style={{ fontSize: 12, color: C.ink2 }}>
            Photo verdict: <Text style={{ fontWeight: '600', color: C.ink }}>
              {condition.verdict ?? 'Unverifiable'}
            </Text>{' · '}{Math.round((condition.confidence ?? 0) * 100)}% confidence
          </Text>
        </View>
      )}

      {/* Toggle */}
      <Pressable onPress={() => setOpen(v => !v)} hitSlop={12}
        style={{ paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {open ? <ChevronUp size={14} color={C.amberDark} strokeWidth={2.5} /> : <ChevronDown size={14} color={C.amberDark} strokeWidth={2.5} />}
        <Text style={{ fontSize: 13, color: C.amberDark, fontWeight: '600' }}>
          {open ? 'Hide reasoning' : 'View full reasoning'}
        </Text>
      </Pressable>

      {open && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 8, borderTopWidth: 1, borderTopColor: C.border2, paddingTop: 12 }}>
          {condition && (
            <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2, marginBottom: 4 }}>ก่อนหน้า · Prior</Text>
              <Text style={{ fontSize: 13, color: C.ink, lineHeight: 19 }}>{condition.prior_condition}</Text>
            </View>
          )}
          {condition && (
            <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2, marginBottom: 4 }}>ปัจจุบัน · Current</Text>
              <Text style={{ fontSize: 13, color: C.ink, lineHeight: 19 }}>{condition.current_condition}</Text>
            </View>
          )}
          {verdict?.reasoning_en && (
            <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2, marginBottom: 4 }}>Reasoning (EN)</Text>
              <Text style={{ fontSize: 13, color: C.ink, lineHeight: 19 }}>{verdict.reasoning_en}</Text>
            </View>
          )}
          {verdict?.recommended_action_th && (
            <View style={{ backgroundColor: C.surface2, borderRadius: 12, padding: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2, marginBottom: 4 }}>ข้อแนะนำ · Recommended action</Text>
              <Text style={{ fontSize: 13, color: C.ink, lineHeight: 19 }}>{verdict.recommended_action_th}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ResultsScreen() {
  const theme   = useStore(s => s.theme);
  const C       = getColors(theme);
  const result  = useStore(s => s.result);
  const addCase = useStore(s => s.addCase);
  const saved   = useRef(false);

  useEffect(() => {
    if (!result || saved.current) return;
    saved.current = true;
    addCase({
      id: result.handover_id,
      createdAt: new Date().toISOString(),
      items: result.items.map(i => i.condition_item.item).filter(Boolean),
      totalEstimatedCost: result.total_estimated_cost_thb,
      totalDadResponsibility: result.total_dad_responsibility_thb,
      needsDisputeResolution: result.needs_dispute_resolution,
    });
  }, [result]);

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

  const r: HandoverAnalysis = result;
  const ags = r.agreement_summary;
  const pct = r.total_estimated_cost_thb > 0 ? Math.round(r.total_dad_responsibility_thb / r.total_estimated_cost_thb * 100) : 0;
  const occupantCount = r.items.filter(i => i.verdict?.responsibility === 'OCCUPANT_RESPONSIBILITY').length;
  const disputedCount = r.items.filter(i => i.verdict?.responsibility === 'DISPUTED').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────── */}
        <View style={{ backgroundColor: C.ink, borderRadius: 24, padding: 24, marginBottom: 16 }}>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: 1.5, marginBottom: 6 }}>HANDOVER RESULT</Text>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 20, letterSpacing: -0.5 }}>
            {disputedCount > 0 ? 'Disputed items found' : occupantCount > 0 ? 'Occupant-responsible items found' : 'All items resolved'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', marginBottom: 6 }}>TOTAL ESTIMATED COST</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>฿{r.total_estimated_cost_thb.toLocaleString()}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(52,211,153,0.15)', borderRadius: 16, padding: 16 }}>
              <Text style={{ fontSize: 11, color: 'rgba(52,211,153,0.8)', fontWeight: '600', marginBottom: 6 }}>DAD RESPONSIBILITY ({pct}%)</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#34D399' }}>฿{r.total_dad_responsibility_thb.toLocaleString()}</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Occupant: ฿{r.total_occupant_responsibility_thb.toLocaleString()}</Text>
            </View>
          </View>
        </View>

        {/* ── Agreement Parser ─────────────────── */}
        {ags && (
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} color={C.amberDark} strokeWidth={2} />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>Agreement Parser</Text>
            </View>
            <InfoRow label="Occupancy period" value={ags.occupancy_start && ags.occupancy_end ? `${ags.occupancy_start} → ${ags.occupancy_end}` : '—'} />
            <InfoRow label="Notice" value={`${ags.notice_period_days ?? 30} days`} />
            <InfoRow label="Monthly fee" value={`฿${ags.monthly_fee_thb?.toLocaleString() ?? 0}/mo`} />
            {ags.deposit_amount_thb != null && (
              <InfoRow label="Deposit" value={`฿${ags.deposit_amount_thb.toLocaleString()} (${ags.deposit_months ?? 0} mo)`} />
            )}

            {r.non_compliant_clauses.length > 0 && (
              <View style={{ marginTop: 12, backgroundColor: C.dangerBg, borderRadius: 14, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <TriangleAlert size={14} color={C.danger} strokeWidth={2} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger }}>Non-compliant clauses found ({r.non_compliant_clauses.length})</Text>
                </View>
                {r.non_compliant_clauses.map((c, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={{ fontSize: 12, color: C.danger, fontStyle: 'italic' }} numberOfLines={2}>"{c.clause_text}"</Text>
                    <Text style={{ fontSize: 12, color: C.danger, marginTop: 2 }}>{c.reason_non_compliant}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ── Items ─────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Scale size={16} color={C.ink2} strokeWidth={2} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink2, textTransform: 'uppercase', letterSpacing: 1 }}>Policy verdicts · All items</Text>
        </View>
        {r.items.map((item, i) => <ItemRow key={i} item={item} />)}

        {/* ── Case summary ───────────────────── */}
        {(r.case_summary_th || r.case_summary_en) && (
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 12 }}>Handover summary</Text>
            {r.case_summary_th && <Text style={{ fontSize: 14, color: C.ink, lineHeight: 22, marginBottom: 10 }}>{r.case_summary_th}</Text>}
            {r.case_summary_en && <Text style={{ fontSize: 13, color: C.ink2, lineHeight: 20, fontStyle: 'italic' }}>{r.case_summary_en}</Text>}
          </View>
        )}

        <Pressable
          onPress={() => router.push('/documents')}
          style={{ backgroundColor: C.amberDark, borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Generate documents →</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
