import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline';
}) {
  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        className={`rounded-lg px-6 py-4 items-center border-2 ${
          isDisabled ? 'border-gray-200' : 'border-primary'
        }`}
        activeOpacity={0.75}
        hitSlop={8}
      >
        <Text className={`font-bold text-base ${isDisabled ? 'text-gray-400' : 'text-primary'}`}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      className={`rounded-lg px-6 py-4 items-center flex-row justify-center gap-2 ${
        isDisabled ? 'bg-gray-200' : 'bg-primary'
      }`}
      activeOpacity={0.8}
      hitSlop={8}
    >
      {loading && <ActivityIndicator size="small" color="#FFFFFF" />}
      <Text className={`font-bold text-base ${isDisabled ? 'text-gray-400' : 'text-white'}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
