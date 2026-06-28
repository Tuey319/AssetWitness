import { router } from 'expo-router';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavHeader } from '@/components/NavHeader';

const DOCS = [
  {
    tagBg: 'bg-primary-soft',
    tagText: 'text-primary',
    tagLabel: 'OCPB',
    title: 'คำร้องเรียน สคบ.',
    subtitle: 'OCPB Formal Complaint Letter',
    icon: '📋',
  },
  {
    tagBg: 'bg-disputed-soft',
    tagText: 'text-disputed',
    tagLabel: 'DEMAND',
    title: 'หนังสือทวงเงินประกัน',
    subtitle: 'Deposit Demand Letter to Landlord',
    icon: '📄',
  },
  {
    tagBg: 'bg-lawful-soft',
    tagText: 'text-lawful',
    tagLabel: 'EVIDENCE',
    title: 'สรุปหลักฐานประกอบคำร้อง',
    subtitle: 'Evidence Summary Document',
    icon: '🗂️',
  },
] as const;

export default function DocumentsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <NavHeader step={4} label="เอกสาร · Documents" />
      <ScrollView className="flex-1 px-4">
        <View className="py-4">
          <Text className="text-2xl font-bold text-gray-900">เอกสารของคุณ</Text>
          <Text className="text-gray-500 text-sm">Your legal documents</Text>
        </View>

        {DOCS.map((doc, i) => (
          <View key={i} className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
            <View className="flex-row items-start justify-between mb-3">
              <View className={`px-2 py-0.5 rounded-sm ${doc.tagBg}`}>
                <Text className={`text-xs font-bold ${doc.tagText}`}>{doc.tagLabel}</Text>
              </View>
              <View className="bg-gray-100 px-2 py-0.5 rounded-sm">
                <Text className="text-gray-500 text-xs">เร็วๆ นี้ / coming soon</Text>
              </View>
            </View>
            <Text className="text-3xl mb-2">{doc.icon}</Text>
            <Text className="text-gray-900 font-bold text-base">{doc.title}</Text>
            <Text className="text-gray-500 text-sm">{doc.subtitle}</Text>
          </View>
        ))}

        <View className="bg-primary-soft rounded-lg p-4 mb-6">
          <Text className="text-primary font-semibold text-sm mb-1">
            ขั้นตอนต่อไป · Next steps
          </Text>
          <Text className="text-primary-dark text-sm leading-5">
            ส่งเอกสารยื่นให้ สคบ. ที่ ocpb.go.th หรือโทร 1166{'\n'}
            File documents with OCPB at ocpb.go.th or call 1166
          </Text>
        </View>

        <TouchableOpacity onPress={() => router.replace('/')} className="pb-8 items-center">
          <Text className="text-gray-400 text-sm">← เริ่มใหม่ · Start over</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
