import { router } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

/**
 * Stack screen header — back button + title.
 * Used on Analyzing / Results / Details / Documents (not on tabs).
 */
export function NavHeader({
  title, subtitle, showBack = true,
}: {
  title: string; subtitle?: string; showBack?: boolean;
}) {
  return (
    <View className="bg-surface border-b border-line-2 px-4 pt-3 pb-3 flex-row items-center gap-3">
      {showBack && (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="w-8 h-8 rounded-full bg-canvas items-center justify-center active:bg-surface-3"
        >
          <ArrowLeft size={16} color="#09090B" strokeWidth={2} />
        </Pressable>
      )}
      <View className="flex-1">
        <Text className="text-h3 text-ink font-semibold">{title}</Text>
        {subtitle && <Text className="text-label text-ink-3 mt-0.5">{subtitle}</Text>}
      </View>
      {/* Brand mark */}
      <View className="bg-brand rounded-md w-6 h-6 items-center justify-center">
        <Text className="text-label-xs text-white font-bold">RW</Text>
      </View>
    </View>
  );
}
