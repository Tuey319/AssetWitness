import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavHeader } from '@/components/NavHeader';
import { generateDocuments } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { DocsDetails, GenerateDocsForm } from '@/lib/types';

// Display metadata keyed by the document keys Agent 04 returns.
const DOC_META: Record<string, { tagBg: string; tagText: string; tagLabel: string; title: string; subtitle: string; icon: string }> = {
  ocpb_complaint: {
    tagBg: 'bg-primary-soft', tagText: 'text-primary', tagLabel: 'OCPB',
    title: 'คำร้องเรียน สคบ.', subtitle: 'OCPB Formal Complaint Letter', icon: '📋',
  },
  deposit_demand: {
    tagBg: 'bg-disputed-soft', tagText: 'text-disputed', tagLabel: 'DEMAND',
    title: 'หนังสือทวงเงินประกัน', subtitle: 'Deposit Demand Letter to Landlord', icon: '📄',
  },
  evidence_summary: {
    tagBg: 'bg-lawful-soft', tagText: 'text-lawful', tagLabel: 'EVIDENCE',
    title: 'สรุปหลักฐานประกอบคำร้อง', subtitle: 'Evidence Summary Document', icon: '🗂️',
  },
};

const FALLBACK_KEYS = ['ocpb_complaint', 'deposit_demand', 'evidence_summary'] as const;

// Assemble the Agent04Input from the analysis verdicts + PII collected on the Details screen.
// If details are missing (e.g. direct navigation), empty placeholders are sent — fine in mock mode.
// See API_CONTRACT.md "Larger follow-up".
function buildDocsForm(verdicts: GenerateDocsForm['verdicts'], details: DocsDetails | null): GenerateDocsForm {
  const totalUnlawful = verdicts
    .filter((c) => c.legal.classification === 'UNLAWFUL')
    .reduce((sum, c) => sum + c.claim.amount_thb, 0);
  return {
    case_id: `RW-${Date.now()}`,
    routing: details?.routing ?? 'OCPB',
    documents_to_generate: [...FALLBACK_KEYS],
    tenant: details?.tenant ?? { name_th: '', name_en: '', id_number: '', address: '', phone: '' },
    landlord: details?.landlord ?? { name_th: '', address: '', unit_count: 0 },
    lease: details?.lease ?? { property_address: '', start_date: '', end_date: '', deposit_thb: 0, monthly_rent_thb: 0 },
    verdicts,
    total_unlawful_thb: totalUnlawful,
    evidence_photos: [],
    case_summary_th: '',
    case_summary_en: '',
  };
}

export default function DocumentsScreen() {
  const result = useStore((s) => s.result);
  const docsDetails = useStore((s) => s.docsDetails);
  const docsResult = useStore((s) => s.docsResult);
  const setDocsResult = useStore((s) => s.setDocsResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result || docsResult) return;
    setLoading(true);
    generateDocuments(buildDocsForm(result.claims, docsDetails))
      .then((data) => setDocsResult(data))
      .catch((e: Error) => setError(e.message || 'สร้างเอกสารไม่สำเร็จ / Could not generate documents'))
      .finally(() => setLoading(false));
  }, []); // run once on mount

  const docEntries = docsResult ? Object.entries(docsResult.documents) : [];

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <NavHeader step={5} label="เอกสาร · Documents" />
      <ScrollView className="flex-1 px-4">
        <View className="py-4">
          <Text className="text-2xl font-bold text-gray-900">เอกสารของคุณ</Text>
          <Text className="text-gray-500 text-sm">Your legal documents</Text>
        </View>

        {loading && (
          <View className="bg-white rounded-lg border border-gray-200 p-6 mb-3 items-center">
            <ActivityIndicator />
            <Text className="text-gray-500 text-sm mt-2">กำลังสร้างเอกสาร · Generating…</Text>
          </View>
        )}

        {error && (
          <View className="bg-unlawful-soft border border-unlawful rounded-lg p-4 mb-3">
            <Text className="text-unlawful text-sm">{error}</Text>
          </View>
        )}

        {/* Generated documents */}
        {docEntries.map(([key, doc]) => {
          const meta = DOC_META[key] ?? {
            tagBg: 'bg-gray-100', tagText: 'text-gray-600', tagLabel: 'DOC',
            title: key, subtitle: '', icon: '📄',
          };
          return (
            <View key={key} className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
              <View className="flex-row items-start justify-between mb-3">
                <View className={`px-2 py-0.5 rounded-sm ${meta.tagBg}`}>
                  <Text className={`text-xs font-bold ${meta.tagText}`}>{meta.tagLabel}</Text>
                </View>
                <Text className="text-gray-400 text-xs">{doc.page_count} หน้า / pages</Text>
              </View>
              <Text className="text-3xl mb-2">{meta.icon}</Text>
              <Text className="text-gray-900 font-bold text-base">{meta.title}</Text>
              <Text className="text-gray-500 text-sm mb-3">{meta.subtitle}</Text>
              <TouchableOpacity
                onPress={() => WebBrowser.openBrowserAsync(doc.download_url)}
                className="bg-primary rounded-lg py-2 items-center"
              >
                <Text className="text-white font-semibold text-sm">ดาวน์โหลด · Download</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Fallback placeholders when nothing generated yet and not loading */}
        {!loading && docEntries.length === 0 &&
          FALLBACK_KEYS.map((key) => {
            const doc = DOC_META[key];
            return (
              <View key={key} className="bg-white rounded-lg border border-gray-200 p-4 mb-3">
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
            );
          })}

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
