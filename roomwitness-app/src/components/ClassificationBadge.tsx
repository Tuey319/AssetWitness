import { Text, View } from 'react-native';

type Classification = 'LAWFUL' | 'DISPUTED' | 'UNLAWFUL';

const CFG: Record<Classification, { bg: string; text: string; dot: string; label: string; labelTh: string }> = {
  LAWFUL:   { bg: 'bg-ok-soft',     text: 'text-ok-ink',     dot: 'bg-ok',     label: 'Lawful',    labelTh: 'ถูกกฎหมาย' },
  DISPUTED: { bg: 'bg-warn-soft',   text: 'text-warn-ink',   dot: 'bg-warn',   label: 'Disputed',  labelTh: 'โต้แย้งได้' },
  UNLAWFUL: { bg: 'bg-danger-soft', text: 'text-danger-ink', dot: 'bg-danger', label: 'Unlawful',  labelTh: 'ผิดกฎหมาย' },
};

export function ClassificationBadge({
  classification, showThai = false,
}: {
  classification: Classification;
  showThai?: boolean;
}) {
  const c = CFG[classification];
  return (
    <View className={`flex-row items-center gap-1.5 px-2.5 py-1 rounded-full ${c.bg}`}>
      <View className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <Text className={`text-label font-semibold ${c.text}`}>
        {showThai ? c.labelTh : c.label}
      </Text>
    </View>
  );
}
