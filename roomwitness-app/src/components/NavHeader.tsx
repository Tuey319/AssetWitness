import { Text, View } from 'react-native';

export function NavHeader({ step, label }: { step: 1 | 2 | 3 | 4 | 5; label: string }) {
  const total = 5;

  return (
    <View className="bg-bg-secondary border-b border-separator px-4 pt-2 pb-3">
      {/* Brand */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="bg-primary rounded-lg w-7 h-7 items-center justify-center">
            <Text className="text-white text-xs font-bold tracking-tight">RW</Text>
          </View>
          <Text className="text-navy font-bold text-sm">RoomWitness</Text>
        </View>
        <Text className="text-label-secondary text-xs">{label}</Text>
      </View>

      {/* Progress bar */}
      <View className="flex-row items-center gap-1">
        {Array.from({ length: total }).map((_, i) => {
          const n = i + 1;
          const done = n <= step;
          return (
            <View
              key={i}
              className={`flex-1 h-1 rounded-full ${done ? 'bg-primary' : 'bg-separator-opaque'}`}
            />
          );
        })}
      </View>
    </View>
  );
}
