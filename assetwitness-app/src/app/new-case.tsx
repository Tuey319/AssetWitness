import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowRight, Camera, ChevronLeft, ImagePlus, Plus, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Image, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';
import type { CaseType, ConditionItem } from '@/lib/types';

const { width: W } = Dimensions.get('window');

let _id = 0;
type Row = ConditionItem & { rowId: number };
const newRow = (): Row => ({ rowId: ++_id, item_id: `I${String(_id).padStart(3, '0')}`, item: '', description: '', estimated_cost_thb: 0 });

const STEPS = [
  { headline: "What items\nneed checking?", sub: 'Add each condition item',                accent: '#E07A3F' },
  { headline: "Add\ncondition photos",      sub: 'Prior condition vs current condition',   accent: '#60A5FA' },
  { headline: "Occupancy\nagreement",       sub: 'Fee, dates, case type — optional',        accent: '#34D399' },
  { headline: "You're\nready.",              sub: 'Review before running the pipeline',      accent: '#C084FC' },
];

const CASE_TYPES: { key: CaseType; label: string }[] = [
  { key: 'move_in', label: 'Move-in' },
  { key: 'move_out', label: 'Move-out' },
  { key: 'fit_out_inspection', label: 'Fit-out' },
];

function DarkInput({ label, value, onChange, placeholder, numeric = false, multiline = false }: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder: string; numeric?: boolean; multiline?: boolean;
}) {
  const C = getColors(useStore(s => s.theme));
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 7 }}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChange} placeholder={placeholder}
        keyboardType={numeric ? 'numeric' : 'default'} multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        placeholderTextColor={C.ink3}
        style={{
          backgroundColor: focus ? C.surface2 : C.surface,
          borderWidth: 1, borderColor: focus ? C.amber : C.border,
          borderRadius: 13, paddingHorizontal: 14, paddingVertical: 13,
          fontSize: 15, color: C.ink, minHeight: multiline ? 80 : 50,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

function PhotoStrip({ label, uris, onAdd, onRemove }: { label: string; uris: string[]; onAdd: (u: string) => void; onRemove: (i: number) => void }) {
  const C = getColors(useStore(s => s.theme));

  async function pickFromLibrary() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!r.canceled) r.assets.forEach(a => onAdd(a.uri));
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera permission in Settings to take photos.');
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!r.canceled) r.assets.forEach(a => onAdd(a.uri));
  }

  function choose() {
    Alert.alert('Add photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 10, paddingRight: 4 }}>
          {uris.map((uri, i) => (
            <View key={i} style={{ position: 'relative' }}>
              <Image source={{ uri }} style={{ width: 88, height: 88, borderRadius: 14 }} resizeMode="cover" />
              <Pressable onPress={() => onRemove(i)} hitSlop={8}
                style={{ position: 'absolute', top: -5, right: -5, width: 22, height: 22, borderRadius: 11, backgroundColor: C.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg }}>
                <X size={10} color="#fff" strokeWidth={3} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={choose}
            style={{ width: 88, height: 88, borderRadius: 14, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <View style={{ flexDirection: 'row', gap: 3 }}>
              <Camera size={16} color={C.ink3} strokeWidth={1.5} />
              <ImagePlus size={16} color={C.ink3} strokeWidth={1.5} />
            </View>
            <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default function NewCaseScreen() {
  const setForm          = useStore(s => s.setForm);
  const theme            = useStore(s => s.theme);
  const conditionRecords = useStore(s => s.conditionRecords);
  const C       = getColors(theme);
  const [items, setItems]     = useState<Row[]>([newRow()]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(conditionRecords[0]?.id ?? null);
  const [prior, setPrior]     = useState<string[]>(conditionRecords[0]?.photoUris ?? []);
  const [current, setCurrent] = useState<string[]>([]);
  const [clause, setClause]   = useState('');
  const [occStart, setOccStart] = useState('');
  const [occEnd, setOccEnd]     = useState('');
  const [fee, setFee]           = useState('');
  const [caseType, setCaseType] = useState<CaseType>('move_out');
  const [reportSigned, setReportSigned] = useState(false);
  const [step, setStep]       = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;

  function selectRecord(id: string | null) {
    setSelectedRecordId(id);
    const rec = id ? conditionRecords.find(r => r.id === id) : undefined;
    setPrior(rec ? rec.photoUris : []);
  }

  function goTo(next: number) {
    slideX.setValue((next > step ? 1 : -1) * W);
    setStep(next);
    Animated.spring(slideX, { toValue: 0, tension: 90, friction: 16, useNativeDriver: true }).start();
  }

  function next() {
    if (step === 0 && !items.some(c => c.item.trim())) {
      Alert.alert('Add an item', 'Enter at least one condition item to continue.'); return;
    }
    if (step < 3) goTo(step + 1);
  }

  function submit() {
    const valid = items.filter(c => c.item.trim());
    setForm({
      conditionItems: valid.map(({ item_id, item, description, estimated_cost_thb }) => ({ item_id, item, description, estimated_cost_thb })),
      priorConditionUris: prior.length ? prior : undefined,
      currentConditionUris: current.length ? current : undefined,
      agreementClause: clause || undefined,
      occupancyStart: occStart || undefined,
      occupancyEnd: occEnd || undefined,
      monthlyFee: fee ? Number(fee) : undefined,
      caseType,
      handoverReportSigned: reportSigned,
    });
    router.push('/analyzing');
  }

  const update = (rowId: number, p: Partial<ConditionItem>) => setItems(prev => prev.map(c => c.rowId === rowId ? { ...c, ...p } : c));
  const totalEstimated = items.filter(c => c.item.trim()).reduce((s, c) => s + c.estimated_cost_thb, 0);
  const s = STEPS[step];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      {/* ── Header ─────────────────────────── */}
      <View style={{ backgroundColor: C.surface, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Pressable onPress={() => step > 0 ? goTo(step - 1) : router.back()} hitSlop={12}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
            <ChevronLeft size={14} color={C.ink2} strokeWidth={2.5} />
            <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '600' }}>{step > 0 ? 'Back' : 'Home'}</Text>
          </Pressable>
          <View style={{ backgroundColor: C.amberSoft, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 11, color: C.amberDark, fontWeight: '700' }}>Step {step + 1} of 4</Text>
          </View>
        </View>

        {/* Progress */}
        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 18 }}>
          {[0,1,2,3].map(i => (
            <View key={i} style={{
              flex: 1, height: 3, borderRadius: 999,
              backgroundColor: i <= step ? s.accent : C.border2,
            }} />
          ))}
        </View>

        {/* Title */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -1, lineHeight: 32 }}>{s.headline}</Text>
            <Text style={{ fontSize: 13, color: C.ink2, marginTop: 6 }}>{s.sub}</Text>
          </View>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: s.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF' }}>{step + 1}</Text>
          </View>
        </View>
      </View>

      {/* ── Content ────────────────────────── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: slideX }] }}>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* STEP 0 */}
            {step === 0 && (
              <View style={{ gap: 10 }}>
                {items.map((c, idx) => (
                  <View key={c.rowId} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.amberDark, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#FFFFFF' }}>{idx + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink2 }}>Item {idx + 1}</Text>
                      </View>
                      {items.length > 1 && (
                        <Pressable onPress={() => setItems(p => p.filter(r => r.rowId !== c.rowId))} hitSlop={12}
                          style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
                          <X size={11} color={C.danger} strokeWidth={2.5} />
                        </Pressable>
                      )}
                    </View>
                    <DarkInput label="Item name *" value={c.item} onChange={t => update(c.rowId, { item: t })} placeholder="e.g. conference room wall, floor, HVAC unit" />
                    <DarkInput label="Description" value={c.description} onChange={t => update(c.rowId, { description: t })} placeholder="Describe the condition change" multiline />
                    <DarkInput label="Estimated cost (฿)" value={c.estimated_cost_thb > 0 ? String(c.estimated_cost_thb) : ''} onChange={t => update(c.rowId, { estimated_cost_thb: Number(t) || 0 })} placeholder="Enter THB amount" numeric />
                  </View>
                ))}

                <Pressable onPress={() => setItems(p => [...p, newRow()])}
                  style={{ backgroundColor: C.surface, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Plus size={15} color={C.blue} strokeWidth={2.5} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.blue }}>Add another item</Text>
                </Pressable>

                {totalEstimated > 0 && (
                  <View style={{ backgroundColor: C.amberSoft, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ fontSize: 13, color: C.ink2, fontWeight: '600' }}>Total estimated cost</Text>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: C.amberDark, letterSpacing: -1 }}>฿{totalEstimated.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <View style={{ gap: 16 }}>
                <View style={{ height: 100, position: 'relative', marginBottom: 4 }}>
                  <View style={{ position: 'absolute', left: 0, top: 10, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(96,165,250,0.12)', pointerEvents: 'none' }} />
                  <View style={{ position: 'absolute', left: 60, top: 0, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,158,11,0.08)', pointerEvents: 'none' }} />
                  <View style={{ position: 'absolute', right: 0, top: 15, width: 75, height: 75, borderRadius: 37, backgroundColor: 'rgba(52,211,153,0.08)', pointerEvents: 'none' }} />
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink2 }}>AI compares Before → After</Text>
                    <Text style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>More photos = stronger evidence</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, gap: 20 }}>
                  {conditionRecords.length > 0 ? (
                    <View>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
                        Prior condition photos — from your saved record
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          {conditionRecords.map(r => {
                            const active = r.id === selectedRecordId;
                            return (
                              <Pressable key={r.id} onPress={() => selectRecord(active ? null : r.id)}
                                style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? C.ok : C.surface2, borderWidth: 1, borderColor: active ? C.ok : C.border }}>
                                <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#FFFFFF' : C.ink2 }}>
                                  {r.label} · {r.photoUris.length} photo{r.photoUris.length !== 1 ? 's' : ''}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </ScrollView>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={{ flexDirection: 'row', gap: 10, paddingRight: 4 }}>
                          {prior.map((uri, i) => (
                            <Image key={i} source={{ uri }} style={{ width: 88, height: 88, borderRadius: 14 }} resizeMode="cover" />
                          ))}
                          {prior.length === 0 && (
                            <Text style={{ fontSize: 12, color: C.ink3, paddingVertical: 8 }}>No baseline record selected — tap one above.</Text>
                          )}
                        </View>
                      </ScrollView>
                    </View>
                  ) : (
                    <View>
                      <PhotoStrip label="Prior condition photos" uris={prior} onAdd={u => setPrior(p => [...p, u])} onRemove={i => setPrior(p => p.filter((_, j) => j !== i))} />
                      <Pressable onPress={() => router.push('/move-in')}
                        style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: C.blue, fontWeight: '600' }}>
                          Tip: save baseline condition photos ahead of time →
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  <View style={{ height: 1, backgroundColor: C.border2 }} />
                  <PhotoStrip label="Current condition photos" uris={current} onAdd={u => setCurrent(p => [...p, u])} onRemove={i => setCurrent(p => p.filter((_, j) => j !== i))} />
                </View>

                <View style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14 }}>💡</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: C.ink2, lineHeight: 20 }}>Photos are optional but strongly recommended — they're the strongest evidence for a defensible condition record.</Text>
                </View>
              </View>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <View style={{ gap: 12 }}>
                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 14 }}>Occupancy agreement</Text>
                  <DarkInput label="Relevant clause" value={clause} onChange={setClause} placeholder="Paste clause text from the agreement..." multiline />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><DarkInput label="Occupancy start" value={occStart} onChange={setOccStart} placeholder="2024-01-01" /></View>
                    <View style={{ flex: 1 }}><DarkInput label="Occupancy end" value={occEnd} onChange={setOccEnd} placeholder="2024-12-31" /></View>
                  </View>
                  <DarkInput label="Monthly fee (฿)" value={fee} onChange={setFee} placeholder="10000" numeric />

                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 }}>Case type</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {CASE_TYPES.map(ct => {
                      const active = caseType === ct.key;
                      return (
                        <Pressable key={ct.key} onPress={() => setCaseType(ct.key)}
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center', backgroundColor: active ? C.amber : C.surface2, borderWidth: 1, borderColor: active ? C.amber : C.border }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#0C0A07' : C.ink2 }}>{ct.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable onPress={() => setReportSigned(v => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surface2, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: reportSigned ? C.ok : C.border, backgroundColor: reportSigned ? C.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {reportSigned && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '900' }}>✓</Text>}
                    </View>
                    <Text style={{ fontSize: 13, color: C.ink2, fontWeight: '600', flex: 1 }}>Handover report already signed</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <View style={{ gap: 12 }}>
                {/* Big summary */}
                <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, overflow: 'hidden', position: 'relative' }}>
                  <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,158,11,0.06)', pointerEvents: 'none' }} />
                  <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 2, marginBottom: 6 }}>TOTAL ESTIMATED COST</Text>
                  <Text style={{ fontSize: 48, fontWeight: '900', color: C.amberDark, letterSpacing: -2, lineHeight: 52, marginBottom: 20 }}>
                    ฿{totalEstimated.toLocaleString()}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { v: items.filter(c => c.item.trim()).length, l: 'Items' },
                      { v: prior.length, l: 'Prior' },
                      { v: current.length, l: 'Current' },
                    ].map((s, i) => (
                      <View key={i} style={{ flex: 1, backgroundColor: C.surface2, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: C.ink, letterSpacing: -0.5 }}>{s.v}</Text>
                        <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600', marginTop: 2 }}>{s.l}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Items preview */}
                {items.filter(c => c.item.trim()).map((c) => (
                  <View key={c.rowId} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{c.item}</Text>
                      {c.description ? <Text style={{ fontSize: 12, color: C.ink2, marginTop: 2 }} numberOfLines={1}>{c.description}</Text> : null}
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: C.amberDark }}>฿{c.estimated_cost_thb.toLocaleString()}</Text>
                  </View>
                ))}

                {/* AI agents */}
                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 11, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>4 AI Agents will run</Text>
                  {[
                    { n: '01', l: 'Condition · Photo comparison',      c: C.blue   },
                    { n: '02', l: 'Agreement · Clause parser',          c: '#C084FC' },
                    { n: '03', l: 'Policy · State Property Act RAG',    c: C.ok     },
                    { n: '04', l: 'Docs · Thai PDF export',             c: C.amber  },
                  ].map(a => (
                    <View key={a.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: a.c + '20', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: a.c + '30' }}>
                        <Text style={{ fontSize: 10, fontWeight: '800', color: a.c }}>{a.n}</Text>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: C.ink2 }}>{a.l}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ── Bottom CTA ─────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 20, paddingTop: 12, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.border }}>
        {step < 3 ? (
          <Pressable onPress={next}
            style={{ backgroundColor: STEPS[step].accent, borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>
              {step === 0 ? `Continue · ${items.filter(c=>c.item.trim()).length} item${items.filter(c=>c.item.trim()).length !== 1 ? 's' : ''}` : 'Continue'}
            </Text>
            <ArrowRight size={18} color="#FFFFFF" strokeWidth={2.5} />
          </Pressable>
        ) : (
          <Pressable onPress={submit}
            style={{ backgroundColor: C.amberDark, borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>Run pipeline →</Text>
          </Pressable>
        )}
        {step === 2 && (
          <Pressable onPress={() => goTo(3)} style={{ alignItems: 'center', marginTop: 12 }} hitSlop={12}>
            <Text style={{ fontSize: 13, color: C.ink3, fontWeight: '500' }}>Skip — continue without agreement</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
