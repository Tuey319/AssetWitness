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
import { NavHeader } from '@/components/NavHeader';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/lib/store';
import type { DocsDetails } from '@/lib/types';

const ROUTES: { key: DocsDetails['routing']; label: string }[] = [
  { key: 'OCPB', label: 'สคบ. · OCPB' },
  { key: 'CIVIL', label: 'แพ่ง · Civil' },
  { key: 'BOTH', label: 'ทั้งคู่ · Both' },
];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
  multiline?: boolean;
}) {
  return (
    <View className="mb-3">
      <Text className="text-gray-600 text-xs mb-1">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        multiline={multiline}
        className="bg-white border border-gray-200 rounded-md px-3 py-2 text-gray-900 text-sm"
        placeholderTextColor="#9CA3AF"
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

export default function DetailsScreen() {
  const setDocsDetails = useStore((s) => s.setDocsDetails);

  const [routing, setRouting] = useState<DocsDetails['routing']>('OCPB');
  // Tenant
  const [nameTh, setNameTh] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [tenantAddress, setTenantAddress] = useState('');
  const [phone, setPhone] = useState('');
  // Landlord
  const [landlordName, setLandlordName] = useState('');
  const [landlordAddress, setLandlordAddress] = useState('');
  const [unitCount, setUnitCount] = useState('');
  // Lease
  const [propertyAddress, setPropertyAddress] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deposit, setDeposit] = useState('');
  const [rent, setRent] = useState('');

  function handleSubmit() {
    if (!nameTh.trim()) {
      Alert.alert('ต้องระบุชื่อ', 'กรุณากรอกชื่อผู้เช่า (ภาษาไทย) เพื่อใส่ในเอกสาร');
      return;
    }
    const details: DocsDetails = {
      routing,
      tenant: {
        name_th: nameTh.trim(),
        name_en: nameEn.trim(),
        id_number: idNumber.trim(),
        address: tenantAddress.trim(),
        phone: phone.trim(),
      },
      landlord: {
        name_th: landlordName.trim(),
        address: landlordAddress.trim(),
        unit_count: Number(unitCount) || 0,
      },
      lease: {
        property_address: propertyAddress.trim(),
        start_date: startDate.trim(),
        end_date: endDate.trim(),
        deposit_thb: Number(deposit) || 0,
        monthly_rent_thb: Number(rent) || 0,
      },
    };
    setDocsDetails(details);
    router.push('/documents');
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <NavHeader step={4} label="ข้อมูลเอกสาร · Your details" />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
          <View className="py-4">
            <Text className="text-2xl font-bold text-gray-900 leading-tight">ข้อมูลสำหรับเอกสาร</Text>
            <Text className="text-base text-gray-600">Details for your legal documents</Text>
            <Text className="text-gray-400 text-xs mt-1">
              ข้อมูลนี้จะถูกใส่ลงในเอกสารที่สร้างขึ้น · Used to fill in the generated documents
            </Text>
          </View>

          {/* Routing */}
          <Text className="text-gray-800 font-semibold mb-2">ยื่นเรื่องที่ · Route to</Text>
          <View className="flex-row gap-2 mb-5">
            {ROUTES.map((r) => {
              const active = routing === r.key;
              return (
                <TouchableOpacity
                  key={r.key}
                  onPress={() => setRouting(r.key)}
                  className={`flex-1 rounded-lg py-2 items-center border ${
                    active ? 'bg-primary border-primary' : 'bg-white border-gray-200'
                  }`}
                >
                  <Text className={`text-sm font-semibold ${active ? 'text-white' : 'text-gray-600'}`}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tenant */}
          <Text className="text-gray-800 font-semibold mb-2">ผู้เช่า · Tenant (you)</Text>
          <Field label="ชื่อ-นามสกุล (ไทย) · Full name (Thai)" value={nameTh} onChangeText={setNameTh} placeholder="เช่น สมชาย ใจดี" />
          <Field label="ชื่อ-นามสกุล (อังกฤษ) · Full name (English)" value={nameEn} onChangeText={setNameEn} placeholder="e.g. Somchai Jaidee" />
          <Field label="เลขบัตรประชาชน · ID number" value={idNumber} onChangeText={setIdNumber} placeholder="1-2345-67890-12-3" keyboardType="numeric" />
          <Field label="ที่อยู่ · Address" value={tenantAddress} onChangeText={setTenantAddress} multiline />
          <Field label="เบอร์โทร · Phone" value={phone} onChangeText={setPhone} keyboardType="numeric" />

          {/* Landlord */}
          <Text className="text-gray-800 font-semibold mt-2 mb-2">เจ้าของบ้าน · Landlord</Text>
          <Field label="ชื่อเจ้าของบ้าน · Landlord name" value={landlordName} onChangeText={setLandlordName} />
          <Field label="ที่อยู่เจ้าของบ้าน · Landlord address" value={landlordAddress} onChangeText={setLandlordAddress} multiline />
          <Field label="จำนวนห้อง/ยูนิต · Unit count" value={unitCount} onChangeText={setUnitCount} placeholder="0" keyboardType="numeric" />

          {/* Lease */}
          <Text className="text-gray-800 font-semibold mt-2 mb-2">สัญญาเช่า · Lease</Text>
          <Field label="ที่อยู่ห้องเช่า · Property address" value={propertyAddress} onChangeText={setPropertyAddress} multiline />
          <Field label="วันเริ่มเช่า · Start date" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          <Field label="วันสิ้นสุด · End date" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />
          <Field label="เงินประกัน (฿) · Deposit" value={deposit} onChangeText={setDeposit} placeholder="20000" keyboardType="numeric" />
          <Field label="ค่าเช่าต่อเดือน (฿) · Monthly rent" value={rent} onChangeText={setRent} placeholder="10000" keyboardType="numeric" />

          <View className="pb-10 mt-3">
            <PrimaryButton title="สร้างเอกสาร / Generate documents →" onPress={handleSubmit} disabled={!nameTh.trim()} />
            {!nameTh.trim() && (
              <Text className="text-gray-400 text-xs text-center mt-2">
                กรุณากรอกชื่อผู้เช่า · Enter the tenant name to continue
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
