import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus } from 'lucide-react-native';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export function ImagePickerTile({
  label,
  sublabel,
  onPick,
  uri,
  multiple = false,
  compact = false,
}: {
  label: string;
  sublabel: string;
  onPick: (uri: string) => void;
  uri?: string;
  multiple?: boolean;
  compact?: boolean;
}) {
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: multiple,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length > 0) {
      result.assets.forEach((a) => onPick(a.uri));
    }
  }

  const height = compact ? 'min-h-[90px]' : 'min-h-[110px]';

  return (
    <TouchableOpacity
      onPress={pick}
      className={`border-2 border-dashed border-border rounded-lg items-center justify-center ${height} bg-surface-bg overflow-hidden`}
      activeOpacity={0.7}
      hitSlop={4}
    >
      {uri ? (
        <View className="w-full h-full relative">
          <Image source={{ uri }} className="w-full h-28 rounded-md" resizeMode="cover" />
          <View className="absolute bottom-1 right-1 bg-primary rounded-md px-2 py-0.5">
            <Text className="text-white text-xs font-semibold">เปลี่ยน</Text>
          </View>
        </View>
      ) : (
        <View className="items-center gap-1 p-3">
          {multiple ? (
            <ImagePlus size={22} color="#8FA3B8" strokeWidth={1.5} />
          ) : (
            <Camera size={22} color="#8FA3B8" strokeWidth={1.5} />
          )}
          <Text className="text-text-primary font-semibold text-sm text-center">{label}</Text>
          <Text className="text-text-muted text-xs text-center">{sublabel}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
