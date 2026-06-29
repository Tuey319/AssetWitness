import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavHeader } from '@/components/NavHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/lib/store';
import type { DocsDetails } from '@/lib/types';

const ROUTES: { key: DocsDetails['routing']; label: string; sub: string }[] = [
  { key: 'OCPB', label: 'สคบ.', sub: 'OCPB — Consumer protection' },
  { key: 'CIVIL', label: 'แพ่ง', sub: 'Civil court' },
  { key: 'BOTH', label: 'ทั้งคู่', sub: 'Both channels' },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
  required?: boolean;
}) {
  return (
    <View className="mb-3">
      <View className="flex-row items-center mb-1.5">
        <Text className="text-label-secondary text-xs font-medium">{label}</Text>
        {required && <Text className="text-unlawful text-xs ml-1">*</Text>}
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 2 : 1}
        className="bg-bg rounded-lg px-3 py-3 text-navy text-sm"
        placeholderTextColor="#C7C7CC"
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-label text-sm font-semibold uppercase tracking-wide mb-2 mt-4">
      {title}
    </Text>
  );
}

export default function DetailsScreen() {
  const setDocsDetails = useStore((s) => s.setDocsDetails);
  const [routing, setRouting] = useState<DocsDetails['routing']>('OCPB');
  const [nameTh, setNameTh]               = useState('');
  const [nameEn, setNameEn]               = useState('');
  const [idNumber, setIdNumber]           = useState('');
  const [tenantAddress, setTenantAddress] = useState('');
  const [phone, setPhone]                 = useState('');
  const [landlordName, setLandlordName]   = useState('');
  const [landlordAddress, setLandlordAddress] = useState('');
  const [unitCount, setUnitCount]         = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [deposit, setDeposit]             = useState('');
  const [rent, setRent]                   = useState('');

  function handleSubmit() {
    if (!nameTh.trim()) {
      Alert.alert('ต้องระบุชื่อ', 'กรุณากรอกชื่อผู้เช่า (ภาษาไทย)');
      return;
    }
    setDocsDetails({
      routing,
      tenant: { name_th: nameTh.trim(), name_en: nameEn.trim(), id_number: idNumber.trim(), address: tenantAddress.trim(), phone: phone.trim() },
      landlord: { name_th: landlordName.trim(), address: landlordAddress.trim(), unit_count: Number(unitCount) || 0 },
      lease: { property_address: propertyAddress.trim(), start_date: startDate.trim(), end_date: endDate.trim(), deposit_thb: Number(deposit) || 0, monthly_rent_thb: Number(rent) || 0 },
    });
    router.push('/documents');
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <NavHeader title="ข้อมูลเอกสาร" subtitle="Details for your legal documents" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-5 pb-2">
            <Text className="text-3xl font-bold text-navy">ข้อมูลเอกสาร</Text>
            <Text className="text-label-secondary text-base mt-1">Fill in your details for the legal documents</Text>
          </View>

          {/* Route selector */}
          <SectionHeader title="ยื่นเรื่องที่ไหน" />
          <View className="flex-row gap-2 mb-2">
            {ROUTES.map((r) => {
              const active = routing === r.key;
              return (
                <Pressable
                  key={r.key}
                  onPress={() => setRouting(r.key)}
                  className={`flex-1 rounded-xl py-3 px-2 items-center border ${
                    active ? 'bg-primary border-primary' : 'bg-bg-secondary border-separator'
                  }`}
                >
                  <Text className={`text-sm font-bold ${active ? 'text-white' : 'text-navy'}`}>
                    {r.label}
                  </Text>
                  <Text className={`text-xs mt-0.5 text-center leading-3 ${active ? 'text-white/70' : 'text-label-secondary'}`}>
                    {r.sub}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Tenant */}
          <View className="bg-bg-secondary rounded-xl p-4 mt-2">
            <SectionHeader title="ผู้เช่า (คุณ)" />
            <Field label="ชื่อ-นามสกุล (ไทย)" value={nameTh} onChangeText={setNameTh} placeholder="สมชาย ใจดี" required />
            <Field label="Full name (English)" value={nameEn} onChangeText={setNameEn} placeholder="Somchai Jaidee" />
            <Field label="เลขบัตรประชาชน" value={idNumber} onChangeText={setIdNumber} placeholder="1-2345-67890-12-3" keyboardType="numeric" />
            <Field label="ที่อยู่ผู้เช่า" value={tenantAddress} onChangeText={setTenantAddress} multiline />
            <Field label="เบอร์โทรศัพท์" value={phone} onChangeText={setPhone} keyboardType="numeric" />
          </View>

          {/* Landlord */}
          <View className="bg-bg-secondary rounded-xl p-4 mt-3">
            <SectionHeader title="เจ้าของบ้าน" />
            <Field label="ชื่อเจ้าของบ้าน" value={landlordName} onChangeText={setLandlordName} />
            <Field label="ที่อยู่เจ้าของบ้าน" value={landlordAddress} onChangeText={setLandlordAddress} multiline />
            <Field label="จำนวนยูนิตทั้งหมด" value={unitCount} onChangeText={setUnitCount} placeholder="0 = ไม่ทราบ" keyboardType="numeric" />
          </View>

          {/* Lease */}
          <View className="bg-bg-secondary rounded-xl p-4 mt-3 mb-5">
            <SectionHeader title="สัญญาเช่า" />
            <Field label="ที่อยู่ห้องเช่า" value={propertyAddress} onChangeText={setPropertyAddress} multiline />
            <Field label="วันเริ่มเช่า" value={startDate} onChangeText={setStartDate} placeholder="2024-01-01" />
            <Field label="วันสิ้นสุดสัญญา" value={endDate} onChangeText={setEndDate} placeholder="2024-12-31" />
            <Field label="เงินประกัน (฿)" value={deposit} onChangeText={setDeposit} placeholder="20000" keyboardType="numeric" />
            <Field label="ค่าเช่าต่อเดือน (฿)" value={rent} onChangeText={setRent} placeholder="10000" keyboardType="numeric" />
          </View>

          <PrimaryButton
            title="สร้างเอกสาร →"
            onPress={handleSubmit}
            disabled={!nameTh.trim()}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
