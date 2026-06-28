import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ImagePickerTile } from '@/components/ImagePickerTile';
import { NavHeader } from '@/components/NavHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/lib/store';
import type { LandlordClaim } from '@/lib/types';

let nextId = 1;
type ClaimRow = LandlordClaim & { id: number };

function emptyRow(): ClaimRow {
  return { id: nextId++, item: '', description: '', amount_thb: 0 };
}

export default function UploadScreen() {
  const setForm = useStore((s) => s.setForm);
  const [claims, setClaims] = useState<ClaimRow[]>([emptyRow()]);
  const [moveInUri, setMoveInUri] = useState<string>();
  const [moveOutUri, setMoveOutUri] = useState<string>();
  const [screenshotUris, setScreenshotUris] = useState<string[]>([]);
  const [contractClause, setContractClause] = useState('');
  const [landlordPromises, setLandlordPromises] = useState('');
  const [tenantPromises, setTenantPromises] = useState('');
  const [showOptional, setShowOptional] = useState(false);

  function updateClaim(id: number, patch: Partial<LandlordClaim>) {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function removeClaim(id: number) {
    setClaims((prev) => prev.filter((c) => c.id !== id));
  }

  function addClaim() {
    setClaims((prev) => [...prev, emptyRow()]);
  }

  function handleSubmit() {
    const valid = claims.filter((c) => c.item.trim());
    if (valid.length === 0) {
      Alert.alert('ต้องระบุรายการ', 'กรุณาเพิ่มรายการที่ถูกหักเงินอย่างน้อย 1 รายการ');
      return;
    }
    setForm({
      claims: valid.map(({ item, description, amount_thb }) => ({ item, description, amount_thb })),
      moveIn: moveInUri ? { uri: moveInUri } : undefined,
      moveOut: moveOutUri ? { uri: moveOutUri } : undefined,
      screenshots: screenshotUris.map((uri) => ({ uri })),
      contractClause: contractClause || undefined,
      landlordPromises: landlordPromises || undefined,
      tenantPromises: tenantPromises || undefined,
    });
    router.push('/analyzing');
  }

  const hasValidClaim = claims.some((c) => c.item.trim().length > 0);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <NavHeader step={1} label="อัปโหลด · Upload" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          {/* Hero */}
          <View className="py-4">
            <Text className="text-2xl font-bold text-gray-900 leading-tight">
              ทวงเงินประกันคืน
            </Text>
            <Text className="text-base text-gray-600">Reclaim your deposit</Text>
          </View>

          {/* Claims section */}
          <Text className="text-gray-800 font-semibold mb-2">
            รายการ · Required{' '}
            <Text className="text-gray-500 font-normal text-xs">
              เจ้าของบ้านหักอะไรบ้าง / What is the landlord deducting for?
            </Text>
          </Text>

          {claims.map((claim, idx) => (
            <View key={claim.id} className="bg-gray-50 rounded-lg p-3 mb-2">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-gray-500 text-xs font-semibold">รายการที่ {idx + 1}</Text>
                {claims.length > 1 && (
                  <TouchableOpacity onPress={() => removeClaim(claim.id)}>
                    <Text className="text-red-400 text-sm font-bold">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                placeholder="รายการ · Item (เช่น สีผนัง)"
                value={claim.item}
                onChangeText={(t) => updateClaim(claim.id, { item: t })}
                className="bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm mb-2"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                placeholder="เหตุผลเจ้าของบ้าน · Their reason"
                value={claim.description}
                onChangeText={(t) => updateClaim(claim.id, { description: t })}
                className="bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm mb-2"
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                placeholder="จำนวนเงิน · Amount (฿)"
                value={claim.amount_thb > 0 ? String(claim.amount_thb) : ''}
                onChangeText={(t) => updateClaim(claim.id, { amount_thb: Number(t) || 0 })}
                keyboardType="numeric"
                className="bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          ))}

          <TouchableOpacity
            onPress={addClaim}
            className="border border-dashed border-primary rounded-lg py-3 items-center mb-6"
          >
            <Text className="text-primary font-semibold text-sm">+ เพิ่มรายการ · Add item</Text>
          </TouchableOpacity>

          {/* Evidence section */}
          <Text className="text-gray-800 font-semibold mb-3">
            หลักฐาน · Supporting evidence{' '}
            <Text className="text-gray-400 font-normal text-xs">(ไม่บังคับ)</Text>
          </Text>

          <View className="flex-row gap-3 mb-3">
            <View className="flex-1">
              <Text className="text-gray-600 text-xs mb-1">รูปก่อนเข้าอยู่ · Move-in</Text>
              <ImagePickerTile
                label="รูปถ่ายก่อนเข้า"
                sublabel="Move-in photos"
                onPick={setMoveInUri}
                uri={moveInUri}
              />
            </View>
            <View className="flex-1">
              <Text className="text-gray-600 text-xs mb-1">รูปก่อนออก · Move-out</Text>
              <ImagePickerTile
                label="รูปถ่ายก่อนออก"
                sublabel="Move-out photos"
                onPick={setMoveOutUri}
                uri={moveOutUri}
              />
            </View>
          </View>

          <View className="mb-4">
            <Text className="text-gray-600 text-xs mb-1">แชทกับเจ้าของบ้าน · Screenshots (LINE/WhatsApp)</Text>
            <ImagePickerTile
              label="แชทสกรีนช็อต"
              sublabel="Chat screenshots — optional"
              onPick={(uri) => setScreenshotUris((prev) => [...prev, uri])}
              multiple
            />
            {screenshotUris.length > 0 && (
              <Text className="text-gray-500 text-xs mt-1">
                {screenshotUris.length} ไฟล์ · files selected
              </Text>
            )}
          </View>

          {/* Optional text inputs */}
          <TouchableOpacity
            onPress={() => setShowOptional((v) => !v)}
            className="flex-row items-center mb-3"
          >
            <Text className="text-primary text-sm font-semibold">
              {showOptional ? '▲' : '▼'} ข้อความเพิ่มเติม · More details (optional)
            </Text>
          </TouchableOpacity>

          {showOptional && (
            <View className="gap-3 mb-4">
              <View>
                <Text className="text-gray-600 text-xs mb-1">ข้อความในสัญญา · Contract clause</Text>
                <TextInput
                  placeholder="วางข้อความจากสัญญาเช่า..."
                  value={contractClause}
                  onChangeText={setContractClause}
                  multiline
                  numberOfLines={3}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              </View>
              <View>
                <Text className="text-gray-600 text-xs mb-1">คำสัญญาจากเจ้าของบ้าน · Landlord promises</Text>
                <TextInput
                  placeholder="สัญญาที่เจ้าของบ้านเคยพูด..."
                  value={landlordPromises}
                  onChangeText={setLandlordPromises}
                  multiline
                  numberOfLines={3}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              </View>
              <View>
                <Text className="text-gray-600 text-xs mb-1">คำสัญญาจากผู้เช่า · Tenant promises</Text>
                <TextInput
                  placeholder="สัญญาที่คุณเคยพูด..."
                  value={tenantPromises}
                  onChangeText={setTenantPromises}
                  multiline
                  numberOfLines={3}
                  className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-900 text-sm"
                  placeholderTextColor="#9CA3AF"
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          <View className="pb-8">
            <PrimaryButton
              title="วิเคราะห์ / Analyze →"
              onPress={handleSubmit}
              disabled={!hasValidClaim}
            />
            {!hasValidClaim && (
              <Text className="text-gray-400 text-xs text-center mt-2">
                กรุณาเพิ่มอย่างน้อย 1 รายการ · Add at least 1 claim
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
