import { Text, View } from 'react-native';

const CONFIG = {
  LAWFUL:   { bg: 'bg-lawful-soft',   text: 'text-lawful-dark',   dot: 'bg-lawful',   label: 'ถูกกฎหมาย' },
  DISPUTED: { bg: 'bg-disputed-soft', text: 'text-disputed-dark', dot: 'bg-disputed', label: 'โต้แย้งได้' },
  UNLAWFUL: { bg: 'bg-unlawful-soft', text: 'text-unlawful-dark', dot: 'bg-unlawful', label: 'ผิดกฎหมาย' },
} as const;

export function ClassificationBadge({ classification }: { classification: 'LAWFUL' | 'DISPUTED' | 'UNLAWFUL' }) {
  const { bg, text, dot, label } = CONFIG[classification];
  return (
    <View className={`${bg} px-2.5 py-1 rounded-md flex-row items-center gap-1.5`}>
      <View className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <Text className={`${text} text-xs font-bold`}>{label}</Text>
    </View>
  );
}
