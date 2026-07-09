import { router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';
import type { DocsDetails } from '@/lib/types';

const ROUTES: { key: DocsDetails['routing']; label: string; sub: string }[] = [
  { key: 'OCPB', label: 'สคบ.', sub: 'OCPB — Consumer protection' },
  { key: 'CIVIL', label: 'แพ่ง', sub: 'Civil court' },
  { key: 'BOTH', label: 'ทั้งคู่', sub: 'Both channels' },
];

function Field({ label, value, onChange, placeholder, numeric = false, multiline = false, required = false }: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder?: string; numeric?: boolean; multiline?: boolean; required?: boolean;
}) {
  const C = getColors(useStore(s => s.theme));
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
        {required && <Text style={{ fontSize: 11, color: C.danger, marginLeft: 3 }}>*</Text>}
      </View>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        keyboardType={numeric ? 'numeric' : 'default'} multiline={multiline}
        numberOfLines={multiline ? 2 : 1}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholderTextColor={C.ink3}
        style={{
          backgroundColor: focus ? C.surface2 : C.surface,
          borderWidth: 1, borderColor: focus ? C.amber : C.border,
          borderRadius: 13, paddingHorizontal: 14, paddingVertical: 12,
          fontSize: 14, color: C.ink, minHeight: multiline ? 60 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

function SectionCard({ title, children, C }: { title: string; children: React.ReactNode; C: ReturnType<typeof getColors> }) {
  return (
    <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: C.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14 }}>{title}</Text>
      {children}
    </View>
  );
}

export default function DetailsScreen() {
  const theme = useStore(s => s.theme);
  const C = getColors(theme);
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ backgroundColor: C.surface, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Pressable onPress={() => router.back()} hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.surface2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
          <ChevronLeft size={14} color={C.ink2} strokeWidth={2.5} />
          <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '600' }}>Back</Text>
        </Pressable>
        <Text style={{ fontSize: 26, fontWeight: '900', color: C.ink, letterSpacing: -1 }}>ข้อมูลเอกสาร</Text>
        <Text style={{ fontSize: 13, color: C.ink2, marginTop: 4 }}>Fill in your details for the legal documents</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Route selector */}
          <SectionCard title="ยื่นเรื่องที่ไหน · File with" C={C}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ROUTES.map((r) => {
                const active = routing === r.key;
                return (
                  <Pressable key={r.key} onPress={() => setRouting(r.key)}
                    style={{ flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', borderWidth: 1, backgroundColor: active ? C.amber : C.surface2, borderColor: active ? C.amber : C.border }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: active ? '#FFFFFF' : C.ink }}>{r.label}</Text>
                    <Text style={{ fontSize: 10, marginTop: 2, textAlign: 'center', lineHeight: 13, color: active ? 'rgba(255,255,255,0.75)' : C.ink3 }}>{r.sub}</Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          <SectionCard title="ผู้เช่า (คุณ) · Tenant" C={C}>
            <Field label="ชื่อ-นามสกุล (ไทย) *" value={nameTh} onChange={setNameTh} placeholder="สมชาย ใจดี" required />
            <Field label="Full name (English)" value={nameEn} onChange={setNameEn} placeholder="Somchai Jaidee" />
            <Field label="เลขบัตรประชาชน" value={idNumber} onChange={setIdNumber} placeholder="1-2345-67890-12-3" numeric />
            <Field label="ที่อยู่ผู้เช่า" value={tenantAddress} onChange={setTenantAddress} multiline />
            <Field label="เบอร์โทรศัพท์" value={phone} onChange={setPhone} numeric />
          </SectionCard>

          <SectionCard title="เจ้าของบ้าน · Landlord" C={C}>
            <Field label="ชื่อเจ้าของบ้าน" value={landlordName} onChange={setLandlordName} />
            <Field label="ที่อยู่เจ้าของบ้าน" value={landlordAddress} onChange={setLandlordAddress} multiline />
            <Field label="จำนวนยูนิตทั้งหมด" value={unitCount} onChange={setUnitCount} placeholder="0 = ไม่ทราบ" numeric />
          </SectionCard>

          <SectionCard title="สัญญาเช่า · Lease" C={C}>
            <Field label="ที่อยู่ห้องเช่า" value={propertyAddress} onChange={setPropertyAddress} multiline />
            <Field label="วันเริ่มเช่า" value={startDate} onChange={setStartDate} placeholder="2024-01-01" />
            <Field label="วันสิ้นสุดสัญญา" value={endDate} onChange={setEndDate} placeholder="2024-12-31" />
            <Field label="เงินประกัน (฿)" value={deposit} onChange={setDeposit} placeholder="20000" numeric />
            <Field label="ค่าเช่าต่อเดือน (฿)" value={rent} onChange={setRent} placeholder="10000" numeric />
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border }}>
        <Pressable onPress={handleSubmit} disabled={!nameTh.trim()}
          style={{ backgroundColor: C.amberDark, borderRadius: 16, paddingVertical: 17, alignItems: 'center', opacity: !nameTh.trim() ? 0.5 : 1 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>สร้างเอกสาร →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
