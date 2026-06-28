import { ChevronDown, ChevronUp, Scale } from 'lucide-react-native';
import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ClassificationBadge } from './ClassificationBadge';
import type { ClaimResult } from '@/lib/types';

const DIMS = [
  { key: 'pre_existence',       label: 'ก่อนเข้าอยู่', sub: 'Pre-existence' },
  { key: 'wear_and_tear',       label: 'สึกหรอ',        sub: 'Wear & tear' },
  { key: 'proportionality',     label: 'สัดส่วน',       sub: 'Proportionality' },
  { key: 'contractual_clarity', label: 'สัญญา',         sub: 'Contract' },
] as const;

const BORDER_COLOR = {
  LAWFUL:   'border-l-lawful',
  DISPUTED: 'border-l-disputed',
  UNLAWFUL: 'border-l-unlawful',
} as const;

export function ClaimCard({ item }: { item: ClaimResult }) {
  const [open, setOpen] = useState(false);
  const { claim, cv, legal } = item;
  const border = BORDER_COLOR[legal.classification];

  return (
    <View className={`bg-white rounded-lg border border-border mb-3 overflow-hidden border-l-4 ${border}`}>
      {/* Header */}
      <View className="flex-row items-start justify-between px-4 pt-4 pb-2 gap-3">
        <View className="flex-1">
          <Text className="font-bold text-text-primary text-base leading-5">{claim.item}</Text>
          <Text className="text-text-muted text-xs mt-0.5" numberOfLines={2}>{claim.description}</Text>
        </View>
        <View className="items-end gap-1.5">
          <Text className="font-bold text-text-primary text-base">฿{claim.amount_thb.toLocaleString()}</Text>
          <ClassificationBadge classification={legal.classification} />
        </View>
      </View>

      {/* Thai legal summary */}
      <View className="bg-navy mx-4 mb-3 p-3 rounded-md">
        <View className="flex-row gap-2 items-start">
          <Scale size={14} color="#6B93D6" strokeWidth={1.5} style={{ marginTop: 2 }} />
          <Text className="text-white text-sm leading-5 flex-1">{legal.summary_th}</Text>
        </View>
      </View>

      {/* Legal citations */}
      {legal.legal_basis.length > 0 && (
        <View className="px-4 mb-2 flex-row flex-wrap gap-1.5">
          {legal.legal_basis.map((b, i) => (
            <View key={i} className="bg-primary-soft px-2 py-1 rounded-md">
              <Text className="text-primary text-xs font-mono">
                {b.section}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* CV result pill */}
      {cv?.supports_landlord_claim && (
        <View className="px-4 mb-2">
          <View className="bg-surface-bg rounded-md px-3 py-1.5 flex-row items-center gap-2">
            <View className={`w-2 h-2 rounded-full ${
              cv.supports_landlord_claim === 'YES' ? 'bg-unlawful' :
              cv.supports_landlord_claim === 'NO' ? 'bg-lawful' : 'bg-disputed'
            }`} />
            <Text className="text-text-secondary text-xs">
              ภาพถ่าย:{' '}
              <Text className="font-semibold">
                {cv.supports_landlord_claim === 'YES' ? 'รองรับการเรียกร้อง' :
                 cv.supports_landlord_claim === 'NO'  ? 'ไม่รองรับ' : 'บางส่วน'}
              </Text>
              {' '}· {Math.round((cv.confidence ?? 0) * 100)}% confidence
            </Text>
          </View>
        </View>
      )}

      {/* Expand toggle */}
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        className="px-4 pb-3 flex-row items-center gap-1.5"
        hitSlop={8}
      >
        {open
          ? <ChevronUp size={14} color="#1B4FBB" strokeWidth={2} />
          : <ChevronDown size={14} color="#1B4FBB" strokeWidth={2} />
        }
        <Text className="text-primary text-sm font-semibold">
          {open ? 'ซ่อนรายละเอียด' : 'ดูเหตุผล · See reasoning'}
        </Text>
      </TouchableOpacity>

      {/* Dimensions detail */}
      {open && (
        <View className="px-4 pb-4 gap-2 border-t border-border pt-3">
          {DIMS.map(({ key, label, sub }) => (
            <View key={key} className="bg-surface-bg rounded-md p-3">
              <View className="flex-row items-center gap-1 mb-1">
                <Text className="text-text-muted text-xs font-semibold">{label}</Text>
                <Text className="text-text-muted text-xs">· {sub}</Text>
              </View>
              <Text className="text-text-primary text-sm leading-5">{legal.dimensions[key]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
