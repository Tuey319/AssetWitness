import { Text, View } from 'react-native';

const CONFIG = {
  LAWFUL:   { bg: 'bg-lawful-soft',   text: 'text-lawful',   label: 'ถูกกฎหมาย · Lawful' },
  DISPUTED: { bg: 'bg-disputed-soft', text: 'text-disputed', label: 'โต้แย้งได้ · Disputed' },
  UNLAWFUL: { bg: 'bg-unlawful-soft', text: 'text-unlawful', label: 'ผิดกฎหมาย · Unlawful' },
} as const;

export function ClassificationBadge({
  classification,
}: {
  classification: 'LAWFUL' | 'DISPUTED' | 'UNLAWFUL';
}) {
  const { bg, text, label } = CONFIG[classification];
  return (
    <View className={`${bg} px-2 py-1 rounded-sm`}>
      <Text className={`${text} text-xs font-bold`}>{label}</Text>
    </View>
  );
}
