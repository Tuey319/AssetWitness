import * as ImagePicker from 'expo-image-picker';
import { Image, Text, TouchableOpacity, View } from 'react-native';

export function ImagePickerTile({
  label,
  sublabel,
  onPick,
  uri,
  multiple = false,
}: {
  label: string;
  sublabel: string;
  onPick: (uri: string) => void;
  uri?: string;
  multiple?: boolean;
}) {
  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: multiple,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      result.assets.forEach((a) => onPick(a.uri));
    }
  }

  return (
    <TouchableOpacity
      onPress={pick}
      className="border border-gray-200 rounded-lg p-4 items-center justify-center min-h-[100px] bg-gray-50"
      activeOpacity={0.7}
    >
      {uri ? (
        <Image source={{ uri }} className="w-full h-24 rounded-md" resizeMode="cover" />
      ) : (
        <>
          <Text className="text-2xl mb-1">📷</Text>
          <Text className="text-gray-800 font-semibold text-sm text-center">{label}</Text>
          <Text className="text-gray-400 text-xs text-center mt-0.5">{sublabel}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
