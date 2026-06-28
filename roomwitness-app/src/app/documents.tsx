import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BookOpen, ExternalLink, FileText, RotateCcw, Scroll } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavHeader } from '@/components/NavHeader';
import { generateDocuments } from '@/lib/api';
import { useStore } from '@/lib/store';
import type { DocsDetails, GenerateDocsForm } from '@/lib/types';

const DOC_META: Record<string, {
  Icon: typeof FileText;
  iconColor: string;
  tagBg: string;
  tagText: string;
  tagLabel: string;
  title: string;
  subtitle: string;
}> = {
  ocpb_complaint: {
    Icon: Scroll,
    iconColor: '#007AFF',
    tagBg: 'bg-primary-soft',
    tagText: 'text-primary',
    tagLabel: 'OCPB',
    title: 'คำร้องเรียน สคบ.',
    subtitle: 'OCPB Formal Complaint Letter',
  },
  deposit_demand: {
    Icon: FileText,
    iconColor: '#FF9500',
    tagBg: 'bg-disputed-soft',
    tagText: 'text-disputed-dark',
    tagLabel: 'DEMAND',
    title: 'หนังสือทวงเงินประกัน',
    subtitle: 'Deposit Demand Letter to Landlord',
  },
  evidence_summary: {
    Icon: BookOpen,
    iconColor: '#34C759',
    tagBg: 'bg-lawful-soft',
    tagText: 'text-lawful-dark',
    tagLabel: 'EVIDENCE',
    title: 'สรุปหลักฐานประกอบคำร้อง',
    subtitle: 'Evidence Summary Document',
  },
};

const FALLBACK_KEYS = ['ocpb_complaint', 'deposit_demand', 'evidence_summary'] as const;

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
      .catch((e: Error) => setError(e.message || 'สร้างเอกสารไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  const docEntries = docsResult ? Object.entries(docsResult.documents) : [];

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <NavHeader step={5} label="เอกสารของคุณ" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-5 pb-4">
          <Text className="text-3xl font-bold text-navy">เอกสารของคุณ</Text>
          <Text className="text-label-secondary text-base mt-1">Your legal documents are ready</Text>
        </View>

        {/* Generating */}
        {loading && (
          <View className="bg-bg-secondary rounded-xl border border-separator p-6 mb-3 items-center gap-3">
            <ActivityIndicator color="#007AFF" />
            <Text className="text-label-secondary text-sm">กำลังสร้างเอกสาร...</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View className="bg-unlawful-soft border border-unlawful/30 rounded-xl p-4 mb-3">
            <Text className="text-unlawful-dark text-sm font-semibold mb-1">เกิดข้อผิดพลาด</Text>
            <Text className="text-unlawful text-sm">{error}</Text>
          </View>
        )}

        {/* Documents */}
        {(docEntries.length > 0 ? docEntries : (!loading ? FALLBACK_KEYS.map((k) => [k, null]) : [])).map(([key, doc]) => {
          const meta = DOC_META[key as string] ?? {
            Icon: FileText,
            iconColor: '#8E8E93',
            tagBg: 'bg-bg',
            tagText: 'text-label-secondary',
            tagLabel: 'DOC',
            title: key,
            subtitle: '',
          };
          const { Icon, iconColor, tagBg, tagText, tagLabel, title, subtitle } = meta;
          const isAvailable = doc !== null;

          return (
            <View key={key as string} className="bg-bg-secondary rounded-2xl border border-separator mb-3 overflow-hidden">
              {/* Card header */}
              <View className="flex-row items-center justify-between px-4 pt-4 pb-0">
                <View className={`px-2 py-0.5 rounded-md ${tagBg}`}>
                  <Text className={`text-xs font-bold ${tagText}`}>{tagLabel}</Text>
                </View>
                {isAvailable && doc ? (
                  <Text className="text-label-tertiary text-xs">
                    {(doc as any).page_count} หน้า
                  </Text>
                ) : (
                  <Text className="text-label-tertiary text-xs">เร็วๆ นี้</Text>
                )}
              </View>

              {/* Icon + title */}
              <View className="flex-row items-center gap-3 px-4 pt-3 pb-3">
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center"
                  style={{ backgroundColor: `${iconColor}18` }}
                >
                  <Icon size={22} color={iconColor} strokeWidth={1.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-navy font-bold text-base">{title}</Text>
                  <Text className="text-label-secondary text-xs mt-0.5">{subtitle}</Text>
                </View>
              </View>

              {/* Download CTA */}
              {isAvailable && doc ? (
                <Pressable
                  onPress={() => WebBrowser.openBrowserAsync((doc as any).download_url)}
                  className="mx-4 mb-4 bg-primary rounded-xl py-3 flex-row items-center justify-center gap-2"
                >
                  <ExternalLink size={14} color="#FFFFFF" strokeWidth={2} />
                  <Text className="text-white font-semibold text-sm">ดาวน์โหลด PDF</Text>
                </Pressable>
              ) : (
                <View className="mx-4 mb-4 bg-bg rounded-xl py-3 items-center">
                  <Text className="text-label-tertiary text-sm">จะสร้างให้เร็วๆ นี้</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Next steps */}
        <View className="bg-primary-soft rounded-2xl p-4 mb-4">
          <Text className="text-primary font-bold text-sm mb-1.5">ขั้นตอนต่อไป</Text>
          <Text className="text-primary-dark text-sm leading-5">
            ส่งเอกสารยื่นให้ สคบ. ที่ ocpb.go.th หรือโทร 1166{'\n'}
            File with OCPB at ocpb.go.th or call 1166
          </Text>
        </View>

        {/* Start over */}
        <Pressable
          onPress={() => router.replace('/')}
          className="items-center flex-row justify-center gap-2 py-3"
        >
          <RotateCcw size={14} color="#8E8E93" strokeWidth={2} />
          <Text className="text-label-secondary text-sm">เริ่มกรณีใหม่</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
