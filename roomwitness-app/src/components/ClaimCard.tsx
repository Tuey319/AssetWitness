import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ClassificationBadge } from './ClassificationBadge';
import type { ClaimResult } from '@/lib/types';

const VERDICT_BORDER: Record<string, string> = {
  UNLAWFUL: 'border-l-danger',
  DISPUTED: 'border-l-warn',
  LAWFUL:   'border-l-ok',
};

const DIMS = [
  { key: 'pre_existence',       th: 'ก่อนเข้าอยู่',  en: 'Pre-existence' },
  { key: 'wear_and_tear',       th: 'การสึกหรอ',     en: 'Wear & tear' },
  { key: 'proportionality',     th: 'สัดส่วน',       en: 'Proportionality' },
  { key: 'contractual_clarity', th: 'สัญญา',         en: 'Contract clarity' },
] as const;

export function ClaimCard({ item }: { item: ClaimResult }) {
  const [open, setOpen] = useState(false);
  const { claim, cv, legal } = item;
  const border = VERDICT_BORDER[legal.classification] ?? 'border-l-line';

  return (
    <View className={`bg-surface rounded-2xl border border-line border-l-4 ${border} mb-3 overflow-hidden`}>

      {/* ─── Header row ──────────────────────────────── */}
      <View className="flex-row items-start justify-between px-4 pt-4 pb-3 gap-3">
        <View className="flex-1">
          <Text className="text-h3 text-ink font-semibold" numberOfLines={1}>{claim.item}</Text>
          {claim.description ? (
            <Text className="text-body-sm text-ink-3 mt-0.5" numberOfLines={2}>{claim.description}</Text>
          ) : null}
        </View>
        <View className="items-end gap-1.5">
          <Text className="text-h3 text-ink font-bold">฿{claim.amount_thb.toLocaleString()}</Text>
          <ClassificationBadge classification={legal.classification} />
        </View>
      </View>

      {/* ─── Legal summary ────────────────────────────── */}
      <View className="mx-4 mb-3 bg-ink rounded-xl p-3.5">
        <Text className="text-body-sm text-white/90 leading-relaxed">{legal.summary_th}</Text>
      </View>

      {/* ─── Citation pills ───────────────────────────── */}
      {legal.legal_basis.length > 0 && (
        <View className="px-4 mb-3 flex-row flex-wrap gap-1.5">
          {legal.legal_basis.map((b, i) => (
            <View key={i} className="bg-brand-soft rounded-full px-2.5 py-1">
              <Text className="text-label text-brand font-mono">{b.section}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ─── CV confidence strip ─────────────────────── */}
      {cv && (
        <View className="mx-4 mb-3 flex-row items-center gap-2 bg-surface-2 rounded-xl px-3 py-2.5">
          <View className={`w-2 h-2 rounded-full ${
            cv.supports_landlord_claim === 'NO' ? 'bg-ok' :
            cv.supports_landlord_claim === 'YES' ? 'bg-danger' : 'bg-warn'
          }`} />
          <Text className="text-body-sm text-ink-2 flex-1">
            Photo verdict:{' '}
            <Text className="font-semibold text-ink">
              {cv.supports_landlord_claim === 'YES' ? 'Supports claim' :
               cv.supports_landlord_claim === 'NO'  ? 'Does not support' : 'Partially supports'}
            </Text>
            {'  ·  '}{Math.round((cv.confidence ?? 0) * 100)}% confidence
          </Text>
        </View>
      )}

      {/* ─── Expand toggle ────────────────────────────── */}
      <Pressable
        onPress={() => setOpen(v => !v)}
        hitSlop={12}
        className="px-4 pb-4 flex-row items-center gap-1 active:opacity-70"
      >
        {open
          ? <ChevronUp size={14} color="#0057FF" strokeWidth={2.5} />
          : <ChevronDown size={14} color="#0057FF" strokeWidth={2.5} />}
        <Text className="text-label-lg text-brand font-semibold">
          {open ? 'Hide reasoning' : 'View full reasoning'}
        </Text>
      </Pressable>

      {/* ─── Dimension detail ────────────────────────── */}
      {open && (
        <View className="px-4 pb-4 gap-2 border-t border-line-2 pt-3">
          {DIMS.map(({ key, th, en }) => (
            <View key={key} className="bg-canvas rounded-xl p-3">
              <Text className="text-label text-ink-3 mb-1">{th} · {en}</Text>
              <Text className="text-body-sm text-ink leading-relaxed">{legal.dimensions[key]}</Text>
            </View>
          ))}
          {legal.recommended_action_th ? (
            <View className="bg-brand-soft rounded-xl p-3">
              <Text className="text-label text-brand mb-1">Recommended action</Text>
              <Text className="text-body-sm text-info-ink leading-relaxed">{legal.recommended_action_th}</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}
