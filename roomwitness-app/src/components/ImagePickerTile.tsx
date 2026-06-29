import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus } from 'lucide-react-native';
import { Image, Pressable, Text, View } from 'react-native';

export function ImagePickerTile({
  label, sublabel, onPick, uri, multiple = false,
}: {
  label: string; sublabel: string;
  onPick: (uri: string) => void;
  uri?: string; multiple?: boolean;
}) {
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: multiple, quality: 0.85,
    });
    if (!result.canceled) result.assets.forEach((a) => onPick(a.uri));
  }

  return (
    <Pressable
      onPress={pick}
      className="border border-dashed border-line rounded-xl overflow-hidden bg-canvas active:bg-surface-3"
      style={{ minHeight: 100 }}
    >
      {uri ? (
        <View className="relative">
          <Image source={{ uri }} className="w-full" style={{ height: 120 }} resizeMode="cover" />
          <View className="absolute bottom-2 right-2 bg-brand rounded-lg px-2.5 py-1">
            <Text className="text-label text-white font-semibold">Change</Text>
          </View>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center gap-2 py-6">
          {multiple
            ? <ImagePlus size={24} color="#A1A1AA" strokeWidth={1.5} />
            : <Camera size={24} color="#A1A1AA" strokeWidth={1.5} />}
          <View className="items-center">
            <Text className="text-body-sm text-ink font-medium">{label}</Text>
            <Text className="text-label text-ink-3 mt-0.5">{sublabel}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}
