import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ChevronDown, ChevronUp, ImagePlus, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/lib/store';
import type { LandlordClaim } from '@/lib/types';

let nextId = 1;
type ClaimRow = LandlordClaim & { id: number };
function emptyRow(): ClaimRow {
  return { id: nextId++, item: '', description: '', amount_thb: 0 };
}

function SectionTitle({ title, required }: { title: string; required?: boolean }) {
  return (
    <View className="flex-row items-center mb-2 mt-5">
      <Text className="text-label text-xs font-bold uppercase tracking-widest">{title}</Text>
      {required && <Text className="text-unlawful text-xs ml-1">*</Text>}
    </View>
  );
}

function InputField({
  label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false,
}: {
  label?: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; keyboardType?: 'default' | 'numeric'; multiline?: boolean;
}) {
  return (
    <View className={label ? 'mb-3' : ''}>
      {label && <Text className="text-label-secondary text-xs font-medium mb-1.5">{label}</Text>}
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder}
        keyboardType={keyboardType} multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
        placeholderTextColor="#C7C7CC"
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function PhotoGrid({
  uris, onAdd, onRemove, label,
}: {
  uris: string[]; onAdd: (uri: string) => void; onRemove: (i: number) => void; label: string;
}) {
  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85,
    });
    if (!r.canceled) r.assets.forEach((a) => onAdd(a.uri));
  }
  return (
    <View>
      <Text className="text-label-secondary text-xs font-medium mb-1.5">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {uris.map((uri, i) => (
          <View key={i} className="w-20 h-20 rounded-lg overflow-hidden relative">
            <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
            <Pressable
              onPress={() => onRemove(i)}
              hitSlop={8}
              className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full items-center justify-center"
            >
              <X size={10} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={pick}
          className="w-20 h-20 rounded-lg border-2 border-dashed border-separator items-center justify-center bg-bg"
        >
          <ImagePlus size={20} color="#8E8E93" strokeWidth={1.5} />
          <Text className="text-label-tertiary text-xs mt-1">Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const setForm = useStore((s) => s.setForm);
  const [claims, setClaims] = useState<ClaimRow[]>([emptyRow()]);
  const [moveInUris, setMoveInUris]   = useState<string[]>([]);
  const [moveOutUris, setMoveOutUris] = useState<string[]>([]);
  const [screenshotUris, setScreenshotUris] = useState<string[]>([]);
  const [contractClause, setContractClause] = useState('');
  const [landlordPromises, setLandlordPromises] = useState('');
  const [tenantPromises, setTenantPromises]     = useState('');
  const [leaseStart, setLeaseStart]   = useState('');
  const [leaseEnd, setLeaseEnd]       = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [monthlyRent, setMonthlyRent]     = useState('');
  const [landlordUnits, setLandlordUnits] = useState('');
  const [showOptional, setShowOptional]   = useState(false);

  function updateClaim(id: number, patch: Partial<LandlordClaim>) {
    setClaims((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }
  function removeClaim(id: number) { setClaims((prev) => prev.filter((c) => c.id !== id)); }
  function addClaim() { setClaims((prev) => [...prev, emptyRow()]); }

  function handleSubmit() {
    const valid = claims.filter((c) => c.item.trim());
    if (!valid.length) { Alert.alert('ต้องระบุรายการ', 'เพิ่มรายการที่ถูกหักเงินอย่างน้อย 1 รายการ'); return; }
    setForm({
      claims: valid.map(({ item, description, amount_thb }) => ({ item, description, amount_thb })),
      moveInUris: moveInUris.length ? moveInUris : undefined,
      moveOutUris: moveOutUris.length ? moveOutUris : undefined,
      screenshots: screenshotUris.map((uri) => ({ uri })),
      contractClause: contractClause || undefined,
      landlordPromises: landlordPromises || undefined,
      tenantPromises: tenantPromises || undefined,
      leaseStart: leaseStart || undefined,
      leaseEnd: leaseEnd || undefined,
      depositAmount: depositAmount ? Number(depositAmount) : undefined,
      monthlyRent: monthlyRent ? Number(monthlyRent) : undefined,
      landlordUnitCount: landlordUnits ? Number(landlordUnits) : undefined,
    });
    router.push('/analyzing');
  }

  const hasValidClaim = claims.some((c) => c.item.trim());

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="pt-6 pb-2">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="bg-primary rounded-lg w-7 h-7 items-center justify-center">
                <Text className="text-white text-xs font-bold">RW</Text>
              </View>
              <Text className="text-label-secondary text-sm">RoomWitness</Text>
            </View>
            <Text className="text-3xl font-bold text-navy leading-tight">ทวงเงินประกันคืน</Text>
            <Text className="text-label-secondary text-base mt-1">Thai Rental Deposit Analyzer</Text>
          </View>

          {/* ── CLAIMS ─────────────────────────────────── */}
          <SectionTitle title="รายการที่ถูกหัก" required />

          {claims.map((claim, idx) => (
            <View key={claim.id} className="bg-bg-secondary rounded-xl mb-2 overflow-hidden">
              <View className="flex-row items-center px-4 pt-3 pb-1 justify-between">
                <View className="bg-primary-soft rounded-md px-2 py-0.5">
                  <Text className="text-primary text-xs font-bold">รายการที่ {idx + 1}</Text>
                </View>
                {claims.length > 1 && (
                  <Pressable onPress={() => removeClaim(claim.id)} hitSlop={12}
                    className="w-6 h-6 items-center justify-center rounded-full bg-unlawful-soft">
                    <X size={12} color="#FF3B30" strokeWidth={2.5} />
                  </Pressable>
                )}
              </View>
              <View className="px-4 pb-4 gap-2">
                <TextInput
                  placeholder="ชื่อรายการ เช่น สีผนัง, โซฟา, พื้น"
                  value={claim.item}
                  onChangeText={(t) => updateClaim(claim.id, { item: t })}
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                />
                <TextInput
                  placeholder="เหตุผลของเจ้าของบ้าน (their reason)"
                  value={claim.description}
                  onChangeText={(t) => updateClaim(claim.id, { description: t })}
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                  multiline numberOfLines={2} textAlignVertical="top"
                />
                <TextInput
                  placeholder="จำนวนเงิน (฿) · Amount THB"
                  value={claim.amount_thb > 0 ? String(claim.amount_thb) : ''}
                  onChangeText={(t) => updateClaim(claim.id, { amount_thb: Number(t) || 0 })}
                  keyboardType="numeric"
                  className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
                  placeholderTextColor="#C7C7CC"
                />
              </View>
            </View>
          ))}

          <Pressable onPress={addClaim}
            className="border border-dashed border-primary rounded-xl py-3.5 items-center flex-row justify-center gap-2 mb-2">
            <Plus size={16} color="#007AFF" strokeWidth={2} />
            <Text className="text-primary font-semibold text-sm">+ เพิ่มรายการ · Add claim</Text>
          </Pressable>

          {/* ── PHOTOS ─────────────────────────────────── */}
          <SectionTitle title="ภาพถ่าย · Room photos" />
          <View className="bg-bg-secondary rounded-xl p-4 gap-4">
            <PhotoGrid
              label="ภาพก่อนเข้าอยู่ · Move-in photos"
              uris={moveInUris}
              onAdd={(u) => setMoveInUris((p) => [...p, u])}
              onRemove={(i) => setMoveInUris((p) => p.filter((_, idx) => idx !== i))}
            />
            <View className="h-px bg-separator-opaque" />
            <PhotoGrid
              label="ภาพก่อนออก · Move-out photos"
              uris={moveOutUris}
              onAdd={(u) => setMoveOutUris((p) => [...p, u])}
              onRemove={(i) => setMoveOutUris((p) => p.filter((_, idx) => idx !== i))}
            />
          </View>

          {/* ── OPTIONAL ─────────────────────────────── */}
          <Pressable onPress={() => setShowOptional((v) => !v)}
            className="flex-row items-center gap-1.5 mt-5 mb-2 py-1">
            {showOptional
              ? <ChevronUp size={16} color="#007AFF" strokeWidth={2} />
              : <ChevronDown size={16} color="#007AFF" strokeWidth={2} />}
            <Text className="text-primary text-sm font-semibold">
              Additional evidence &amp; context {showOptional ? '' : '(optional)'}
            </Text>
          </Pressable>

          {showOptional && (
            <View className="gap-3">

              {/* Contract */}
              <View className="bg-bg-secondary rounded-xl p-4">
                <Text className="text-navy font-semibold text-sm mb-3">Rental contract</Text>
                <InputField
                  label="Relevant clause (paste from contract)"
                  value={contractClause} onChangeText={setContractClause}
                  placeholder="วางข้อความจากสัญญาเช่า..."
                  multiline
                />
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <InputField label="Lease start" value={leaseStart} onChangeText={setLeaseStart} placeholder="2024-01-01" />
                  </View>
                  <View className="flex-1">
                    <InputField label="Lease end" value={leaseEnd} onChangeText={setLeaseEnd} placeholder="2024-12-31" />
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <InputField label="Deposit paid (THB)" value={depositAmount} onChangeText={setDepositAmount} placeholder="20000" keyboardType="numeric" />
                  </View>
                  <View className="flex-1">
                    <InputField label="Monthly rent (THB)" value={monthlyRent} onChangeText={setMonthlyRent} placeholder="10000" keyboardType="numeric" />
                  </View>
                </View>
                <InputField label="Landlord units (0 = unknown)" value={landlordUnits} onChangeText={setLandlordUnits} placeholder="0" keyboardType="numeric" />
              </View>

              {/* Screenshots */}
              <View className="bg-bg-secondary rounded-xl p-4">
                <Text className="text-navy font-semibold text-sm mb-3">
                  Conversation screenshots
                </Text>
                <PhotoGrid
                  label="LINE / WhatsApp / SMS screenshots"
                  uris={screenshotUris}
                  onAdd={(u) => setScreenshotUris((p) => [...p, u])}
                  onRemove={(i) => setScreenshotUris((p) => p.filter((_, idx) => idx !== i))}
                />
              </View>

              {/* Promises */}
              <View className="bg-bg-secondary rounded-xl p-4 gap-3">
                <Text className="text-navy font-semibold text-sm">Written promises / statements</Text>
                <InputField
                  label="Landlord said / promised"
                  value={landlordPromises} onChangeText={setLandlordPromises}
                  placeholder={'One per line.\ne.g. "I will return deposit in full if room is clean"'}
                  multiline
                />
                <InputField
                  label="Tenant said / promised"
                  value={tenantPromises} onChangeText={setTenantPromises}
                  placeholder={'One per line.\ne.g. "Wall scuff was already there at move-in"'}
                  multiline
                />
              </View>
            </View>
          )}

          <View className="mt-6">
            <PrimaryButton title="Analyze dispute →" onPress={handleSubmit} disabled={!hasValidClaim} />
            {!hasValidClaim && (
              <Text className="text-label-tertiary text-xs text-center mt-2">
                เพิ่มอย่างน้อย 1 รายการก่อน · Add at least 1 claim
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
