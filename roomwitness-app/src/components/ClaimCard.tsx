import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ClassificationBadge } from './ClassificationBadge';
import type { ClaimResult } from '@/lib/types';

const CV_LABEL: Record<string, string> = {
  YES: 'รองรับ (YES)',
  NO: 'ไม่รองรับ (NO)',
  PARTIAL: 'บางส่วน (PARTIAL)',
};

const DIMS = [
  { key: 'pre_existence',      label: 'ก่อนเข้าอยู่ · Pre-existence' },
  { key: 'wear_and_tear',      label: 'สึกหรอ · Wear & tear' },
  { key: 'proportionality',    label: 'สัดส่วน · Proportionality' },
  { key: 'contractual_clarity',label: 'สัญญา · Contract' },
] as const;

export function ClaimCard({ item }: { item: ClaimResult }) {
  const [open, setOpen] = useState(false);
  const { claim, cv, legal } = item;

  return (
    <View className="bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-4 pb-2 gap-2 flex-wrap">
        <View className="flex-1">
          <Text className="font-bold text-gray-900 text-base">{claim.item}</Text>
          <Text className="text-gray-500 text-xs">{claim.description}</Text>
        </View>
        <View className="items-end gap-1">
          <Text className="font-bold text-gray-900">฿{claim.amount_thb.toLocaleString()}</Text>
          <ClassificationBadge classification={legal.classification} />
        </View>
      </View>

      {/* Thai summary */}
      <View className="bg-surface-navy mx-4 mb-3 p-3 rounded-md">
        <Text className="text-white text-sm leading-5">{legal.summary_th}</Text>
      </View>

      {/* Citations */}
      <View className="px-4 mb-2 flex-row flex-wrap gap-2">
        {legal.legal_basis.map((b, i) => (
          <View key={i} className="bg-gray-100 px-2 py-1 rounded-sm">
            <Text className="text-gray-600 text-xs font-mono">
              §{b.section} · {b.source}
            </Text>
          </View>
        ))}
      </View>

      {/* CV verdict — cv is null/empty when no photos were provided for this claim */}
      {cv?.supports_landlord_claim && (
        <View className="px-4 mb-3">
          <Text className="text-gray-500 text-xs">
            ภาพถ่าย:{' '}
            <Text className="font-semibold text-gray-700">
              {CV_LABEL[cv.supports_landlord_claim] ?? '—'}
            </Text>
          </Text>
        </View>
      )}

      {/* Why toggle */}
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        className="px-4 pb-3 flex-row items-center gap-1"
      >
        <Text className="text-primary text-sm font-semibold">
          {open ? '▲ ซ่อนรายละเอียด' : '▼ เหตุผล · Why'}
        </Text>
      </TouchableOpacity>

      {open && (
        <View className="px-4 pb-4 gap-2">
          {DIMS.map(({ key, label }) => (
            <View key={key} className="bg-gray-50 rounded-md p-3">
              <Text className="text-gray-500 text-xs mb-1 font-semibold">{label}</Text>
              <Text className="text-gray-800 text-sm leading-5">{legal.dimensions[key]}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
