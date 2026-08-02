import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CheckCircle2, ChevronLeft, ImagePlus, ShieldCheck, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';

function DarkInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (t: string) => void; placeholder: string;
}) {
  const C = getColors(useStore(s => s.theme));
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholderTextColor={C.ink3}
        style={{
          backgroundColor: focus ? C.surface2 : C.surface,
          borderWidth: 1, borderColor: focus ? C.amber : C.border,
          borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13,
          fontSize: 15, color: C.ink,
        }}
      />
    </View>
  );
}

export default function BaselineConditionScreen() {
  const C = getColors(useStore(s => s.theme));
  const addConditionRecord = useStore(s => s.addConditionRecord);

  const [label, setLabel] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function pickFromLibrary() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!r.canceled) r.assets.forEach(a => setPhotos(p => [...p, a.uri]));
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera permission in Settings to take photos.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!r.canceled) r.assets.forEach(a => setPhotos(p => [...p, a.uri]));
  }

  function choose() {
    Alert.alert('Add photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  function save() {
    if (photos.length === 0) {
      Alert.alert('Add at least one photo', 'Photograph the space before saving.');
      return;
    }
    setSaving(true);
    addConditionRecord({
      id: `CR-${Date.now()}`,
      createdAt: new Date().toISOString(),
      label: label.trim() || 'Unnamed space',
      photoUris: photos,
    });
    Alert.alert(
      'Saved',
      "Kept on this device until the next handover — no need to re-shoot this space.",
      [{ text: 'Done', onPress: () => router.replace('/(tabs)') }]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ backgroundColor: C.surface, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pressable onPress={() => router.back()} hitSlop={12}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
            <ChevronLeft size={14} color={C.ink2} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '600' }}>Home</Text>
          </Pressable>
          <View style={{ backgroundColor: C.okBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 11, color: C.ok, fontWeight: '700' }}>No AI used yet</Text>
          </View>
        </View>
        <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -1, lineHeight: 32 }}>Document{'\n'}baseline condition</Text>
        <Text style={{ fontSize: 13, color: C.ink2, marginTop: 6 }}>Do this at occupancy start — it's the strongest evidence for the next handover.</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
            <DarkInput label="Space nickname" value={label} onChange={setLabel} placeholder="e.g. Building C, Floor 5, Unit 12" />

            <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Baseline condition photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10, paddingRight: 4 }}>
                {photos.map((uri, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri }} style={{ width: 88, height: 88, borderRadius: 14 }} resizeMode="cover" />
                    <Pressable onPress={() => setPhotos(p => p.filter((_, j) => j !== i))} hitSlop={8}
                      style={{ position: 'absolute', top: -5, right: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg }}>
                      <X size={10} color="#fff" strokeWidth={3} />
                    </Pressable>
                  </View>
                ))}
                <Pressable onPress={choose}
                  style={{ width: 88, height: 88, borderRadius: 14, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <View style={{ flexDirection: 'row', gap: 3 }}>
                    <Camera size={16} color={C.ink3} strokeWidth={1.5} />
                    <ImagePlus size={16} color={C.ink3} strokeWidth={1.5} />
                  </View>
                  <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600' }}>Add</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>

          <View style={{ backgroundColor: C.okBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.okBorder, flexDirection: 'row', gap: 10 }}>
            <ShieldCheck size={18} color={C.ok} strokeWidth={2} />
            <Text style={{ flex: 1, fontSize: 13, color: C.ink2, lineHeight: 20 }}>
              Stored only on this device. Nothing is sent to the AI pipeline until a handover is actually processed.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border }}>
        <Pressable onPress={save} disabled={saving}
          style={{ backgroundColor: C.ok, borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: saving ? 0.6 : 1 }}>
          <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>Save baseline condition record</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
