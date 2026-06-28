import { Text, TouchableOpacity } from 'react-native';

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className={`rounded-lg px-6 py-4 items-center ${disabled ? 'bg-gray-300' : 'bg-primary'}`}
      activeOpacity={0.8}
    >
      <Text className={`font-bold text-base ${disabled ? 'text-gray-500' : 'text-white'}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}
