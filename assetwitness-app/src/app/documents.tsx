import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { BookOpen, ChevronLeft, Download, FileText, RotateCcw, Scroll } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateDocuments } from '@/lib/api';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';
import type { GenerateDocsForm, HandoverAnalysis } from '@/lib/types';

const DOC_META: Record<string, { Icon: typeof FileText; color: string; tag: string; title: string; subtitle: string }> = {
  condition_certification_report: {
    Icon: Scroll, color: '#60A5FA', tag: 'CERT',
    title: 'หนังสือรับรองสภาพทรัพย์สิน', subtitle: 'Condition Certification Report',
  },
  fit_out_completion_checklist: {
    Icon: FileText, color: '#F59E0B', tag: 'CHECKLIST',
    title: 'แบบตรวจสอบความสมบูรณ์งานตกแต่งภายใน', subtitle: 'Fit-Out Completion Checklist',
  },
  liability_summary: {
    Icon: BookOpen, color: '#34D399', tag: 'DISPUTE',
    title: 'สรุปข้อพิพาทเพื่อสนับสนุนการระงับข้อพิพาท', subtitle: 'Liability Summary',
  },
};

const FALLBACK_KEYS = ['condition_certification_report'] as const;

function buildDocsForm(result: HandoverAnalysis): GenerateDocsForm {
  return {
    documents_to_generate: result.documents_to_generate.length > 0 ? result.documents_to_generate : [...FALLBACK_KEYS],
    total_estimated_cost_thb: result.total_estimated_cost_thb,
    total_dad_responsibility_thb: result.total_dad_responsibility_thb,
    total_occupant_responsibility_thb: result.total_occupant_responsibility_thb,
    item_verdicts: result.items.map(i => i.verdict).filter((v): v is NonNullable<typeof v> => v !== null),
    case_summary_th: result.case_summary_th,
    case_summary_en: result.case_summary_en,
  };
}

export default function DocumentsScreen() {
  const theme = useStore(s => s.theme);
  const C = getColors(theme);
  const result = useStore((s) => s.result);
  const docsResult = useStore((s) => s.docsResult);
  const setDocsResult = useStore((s) => s.setDocsResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result || docsResult) return;
    setLoading(true);
    generateDocuments(buildDocsForm(result))
      .then((data) => setDocsResult(data))
      .catch((e: Error) => setError(e.message || 'สร้างเอกสารไม่สำเร็จ'))
      .finally(() => setLoading(false));
  }, []);

  const docEntries = docsResult ? Object.entries(docsResult.documents) : [];
  const rows = docEntries.length > 0 ? docEntries : (!loading ? FALLBACK_KEYS.map((k) => [k, null] as const) : []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ backgroundColor: C.surface, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Pressable onPress={() => router.back()} hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.surface2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
          <ChevronLeft size={14} color={C.ink2} strokeWidth={2.5} />
          <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '600' }}>Back</Text>
        </Pressable>
        <Text style={{ fontSize: 26, fontWeight: '900', color: C.ink, letterSpacing: -1 }}>เอกสารของคุณ</Text>
        <Text style={{ fontSize: 13, color: C.ink2, marginTop: 4 }}>Your handover documents are ready</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 28, marginBottom: 14, alignItems: 'center', gap: 12 }}>
            <ActivityIndicator color={C.amberDark} />
            <Text style={{ fontSize: 13, color: C.ink2 }}>กำลังสร้างเอกสาร... · Generating documents</Text>
          </View>
        )}

        {error && (
          <View style={{ backgroundColor: C.dangerBg, borderWidth: 1, borderColor: C.dangerBorder, borderRadius: 16, padding: 16, marginBottom: 14 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.danger, marginBottom: 3 }}>เกิดข้อผิดพลาด</Text>
            <Text style={{ fontSize: 13, color: C.danger }}>{error}</Text>
          </View>
        )}

        {rows.map(([key, doc]) => {
          const meta = DOC_META[key as string] ?? { Icon: FileText, color: '#8A8A95', tag: 'DOC', title: key as string, subtitle: '' };
          const { Icon, color, tag, title, subtitle } = meta;
          const isAvailable = doc !== null;

          return (
            <View key={key as string} style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, marginBottom: 12, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 }}>
                <View style={{ backgroundColor: color + '18', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color }}>{tag}</Text>
                </View>
                <Text style={{ fontSize: 11, color: C.ink3 }}>
                  {isAvailable && doc ? `${(doc as any).pages} หน้า` : 'เร็วๆ นี้'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 }}>
                <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: color + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color={color} strokeWidth={1.75} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{title}</Text>
                  <Text style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>{subtitle}</Text>
                </View>
              </View>

              {isAvailable && doc ? (
                <Pressable onPress={() => WebBrowser.openBrowserAsync((doc as any).download_url)}
                  style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.amberDark, borderRadius: 14, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Download size={14} color="#FFFFFF" strokeWidth={2} />
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>ดาวน์โหลด PDF</Text>
                </Pressable>
              ) : (
                <View style={{ marginHorizontal: 16, marginBottom: 16, backgroundColor: C.surface2, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, color: C.ink3 }}>จะสร้างให้เร็วๆ นี้</Text>
                </View>
              )}
            </View>
          );
        })}

        <View style={{ backgroundColor: C.amberSoft, borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.amberDark, marginBottom: 6 }}>ขั้นตอนต่อไป · Next steps</Text>
          <Text style={{ fontSize: 13, color: C.ink2, lineHeight: 20 }}>
            ส่งเอกสารให้ผู้แทน ธพส. และผู้ครอบครองลงนามรับรอง{'\n'}
            Route the signed documents to the DAD representative and occupant for sign-off.
          </Text>
        </View>

        <Pressable onPress={() => router.replace('/(tabs)')} style={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 }}>
          <RotateCcw size={14} color={C.ink3} strokeWidth={2} />
          <Text style={{ fontSize: 13, color: C.ink3, fontWeight: '600' }}>เริ่มกรณีใหม่ · Start new case</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
