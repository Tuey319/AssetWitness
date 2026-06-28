'use client';
import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Alert,
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
    <SafeAreaView className="flex-1 bg-bg">
      <NavHeader step={1} label="อัปโหลดข้อมูล" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Large title */}
          <View className="pt-5 pb-4">
            <Text className="text-3xl font-bold text-navy leading-tight">ทวงเงินประกันคืน</Text>
            <Text className="text-label-secondary text-base mt-1">Reclaim your deposit</Text>
          </View>

          {/* ── Claims ──────────────────────────────────────── */}
          <Text className="text-label text-sm font-semibold mb-2 uppercase tracking-wide">
            รายการที่ถูกหัก
          </Text>

          {claims.map((claim, idx) => (
            <View key={claim.id} className="bg-bg-secondary rounded-xl mb-2 overflow-hidden">
              {/* Claim header */}
              <View className="flex-row items-center px-4 pt-3 pb-1 justify-between">
                <View className="bg-primary-soft rounded-md px-2 py-0.5">
                  <Text className="text-primary text-xs font-bold">รายการที่ {idx + 1}</Text>
                </View>
                {claims.length > 1 && (
                  <Pressable
                    onPress={() => removeClaim(claim.id)}
                    hitSlop={12}
                    className="w-6 h-6 items-center justify-center rounded-full bg-unlawful-soft"
                  >
                    <X size={12} color="#FF3B30" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>

              <View className="px-4 pb-4 gap-2">
                <TextInput
                  placeholder="ชื่อรายการ (เช่น สีผนัง, โซฟา)"
                  value={claim.item}
                  onChangeText={(t) => updateClaim(claim.id, { item: t })}
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                  returnKeyType="next"
                />
                <TextInput
                  placeholder="เหตุผลของเจ้าของบ้าน"
                  value={claim.description}
                  onChangeText={(t) => updateClaim(claim.id, { description: t })}
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
                <TextInput
                  placeholder="จำนวนเงิน (฿)"
                  value={claim.amount_thb > 0 ? String(claim.amount_thb) : ''}
                  onChangeText={(t) => updateClaim(claim.id, { amount_thb: Number(t) || 0 })}
                  keyboardType="numeric"
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>
          ))}

          <Pressable
            onPress={addClaim}
            className="border border-dashed border-primary rounded-xl py-3.5 items-center flex-row justify-center gap-2 mb-6"
          >
            <Plus size={16} color="#007AFF" strokeWidth={2} />
            <Text className="text-primary font-semibold text-sm">เพิ่มรายการ</Text>
          </Pressable>

          {/* ── Photos ──────────────────────────────────────── */}
          <Text className="text-label text-sm font-semibold mb-2 uppercase tracking-wide">
            ภาพถ่าย
          </Text>
          <View className="bg-bg-secondary rounded-xl p-4 mb-3 gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-label-secondary text-xs mb-1.5 font-medium">ก่อนเข้าอยู่</Text>
                <ImagePickerTile
                  label="Move-in"
                  sublabel="ก่อนเช่า"
                  onPick={setMoveInUri}
                  uri={moveInUri}
                  compact
                />
              </View>
              <View className="flex-1">
                <Text className="text-label-secondary text-xs mb-1.5 font-medium">ก่อนออก</Text>
                <ImagePickerTile
                  label="Move-out"
                  sublabel="ตอนออก"
                  onPick={setMoveOutUri}
                  uri={moveOutUri}
                  compact
                />
              </View>
            </View>

            <View>
              <Text className="text-label-secondary text-xs mb-1.5 font-medium">
                แชทสกรีนช็อต LINE/WhatsApp
              </Text>
              <ImagePickerTile
                label="อัปโหลดสกรีนช็อต"
                sublabel="เลือกได้หลายรูป · optional"
                onPick={(uri) => setScreenshotUris((prev) => [...prev, uri])}
                multiple
              />
              {screenshotUris.length > 0 && (
                <Text className="text-label-secondary text-xs mt-1">
                  {screenshotUris.length} ไฟล์ที่เลือก
                </Text>
              )}
            </View>
          </View>

          {/* ── Optional details ────────────────────────────── */}
          <Pressable
            onPress={() => setShowOptional((v) => !v)}
            className="flex-row items-center gap-1.5 mb-3 py-1"
          >
            {showOptional
              ? <ChevronUp size={16} color="#007AFF" strokeWidth={2} />
              : <ChevronDown size={16} color="#007AFF" strokeWidth={2} />
            }
            <Text className="text-primary text-sm font-semibold">
              ข้อมูลเพิ่มเติม · More details (optional)
            </Text>
          </Pressable>

          {showOptional && (
            <View className="bg-bg-secondary rounded-xl p-4 mb-5 gap-3">
              <View>
                <Text className="text-label-secondary text-xs font-medium mb-1.5">
                  ข้อความในสัญญา · Contract clause
                </Text>
                <TextInput
                  placeholder="วางข้อความจากสัญญาเช่า..."
                  value={contractClause}
                  onChangeText={setContractClause}
                  multiline
                  numberOfLines={3}
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                  textAlignVertical="top"
                />
              </View>
              <View>
                <Text className="text-label-secondary text-xs font-medium mb-1.5">
                  คำสัญญาจากเจ้าของบ้าน
                </Text>
                <TextInput
                  placeholder="เช่น 'จะคืนเงินประกันภายใน 7 วัน'..."
                  value={landlordPromises}
                  onChangeText={setLandlordPromises}
                  multiline
                  numberOfLines={3}
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                  textAlignVertical="top"
                />
              </View>
              <View>
                <Text className="text-label-secondary text-xs font-medium mb-1.5">
                  คำสัญญาจากผู้เช่า
                </Text>
                <TextInput
                  placeholder="สิ่งที่คุณเคยพูดหรือให้คำมั่น..."
                  value={tenantPromises}
                  onChangeText={setTenantPromises}
                  multiline
                  numberOfLines={3}
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* CTA */}
          <PrimaryButton
            title="วิเคราะห์เลย →"
            onPress={handleSubmit}
            disabled={!hasValidClaim}
          />
          {!hasValidClaim && (
            <Text className="text-label-tertiary text-xs text-center mt-2">
              เพิ่มอย่างน้อย 1 รายการก่อน
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
