import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ArrowRight, ChevronLeft, ImagePlus, Plus, X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Alert, Animated, Dimensions, Image, KeyboardAvoidingView,
  Platform, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import type { LandlordClaim } from '@/lib/types';

const { width: W } = Dimensions.get('window');

const C = {
  bg:        '#0C0A07',
  surface:   '#181410',
  surface2:  '#221C10',
  ink:       '#FAF8F5',
  ink2:      'rgba(250,248,245,0.55)',
  ink3:      'rgba(250,248,245,0.30)',
  amber:     '#F59E0B',
  amberSoft: 'rgba(245,158,11,0.10)',
  border:    'rgba(245,158,11,0.14)',
  border2:   'rgba(250,248,245,0.06)',
  danger:    '#F87171',
  dangerBg:  'rgba(248,113,113,0.10)',
  blue:      '#60A5FA',
  blueBg:    'rgba(96,165,250,0.10)',
  ok:        '#34D399',
  okBg:      'rgba(52,211,153,0.10)',
};

let _id = 0;
type Row = LandlordClaim & { id: number };
const newRow = (): Row => ({ id: ++_id, item: '', description: '', amount_thb: 0 });

const STEPS = [
  { headline: "What is the\nlandlord charging?", sub: 'Add each deduction item', accent: '#F59E0B' },
  { headline: "Add your\nphotos",               sub: 'Move-in vs move-out',      accent: '#60A5FA' },
  { headline: "Extra\nevidence",                sub: 'Contract, messages — optional', accent: '#34D399' },
  { headline: "You're\nready.",                 sub: 'Review before AI analysis', accent: '#C084FC' },
];

function DarkInput({ label, value, onChange, placeholder, numeric = false, multiline = false }: {
  label: string; value: string; onChange: (t: string) => void;
  placeholder: string; numeric?: boolean; multiline?: boolean;
}) {
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
  async function pick() {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!r.canceled) r.assets.forEach(a => onAdd(a.uri));
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
          <Pressable onPress={pick}
            style={{ width: 88, height: 88, borderRadius: 14, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ImagePlus size={20} color={C.ink3} strokeWidth={1.5} />
            <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600' }}>Add</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export default function NewCaseScreen() {
  const setForm = useStore(s => s.setForm);
  const [claims, setClaims]   = useState<Row[]>([newRow()]);
  const [moveIn, setIn]       = useState<string[]>([]);
  const [moveOut, setOut]     = useState<string[]>([]);
  const [shots, setShots]     = useState<string[]>([]);
  const [clause, setClause]   = useState('');
  const [llP, setLLP]         = useState('');
  const [ttP, setTTP]         = useState('');
  const [ls, setLS]           = useState('');
  const [le, setLE]           = useState('');
  const [dep, setDep]         = useState('');
  const [rent, setRent]       = useState('');
  const [units, setUnits]     = useState('');
  const [step, setStep]       = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;

  function goTo(next: number) {
    slideX.setValue((next > step ? 1 : -1) * W);
    setStep(next);
    Animated.spring(slideX, { toValue: 0, tension: 90, friction: 16, useNativeDriver: true }).start();
  }

  function next() {
    if (step === 0 && !claims.some(c => c.item.trim())) {
      Alert.alert('Add a claim', 'Enter at least one item to continue.'); return;
    }
    if (step < 3) goTo(step + 1);
  }

  function submit() {
    const valid = claims.filter(c => c.item.trim());
    setForm({
      claims: valid.map(({ item, description, amount_thb }) => ({ item, description, amount_thb })),
      moveInUris: moveIn.length ? moveIn : undefined,
      moveOutUris: moveOut.length ? moveOut : undefined,
      screenshots: shots.map(uri => ({ uri })),
      contractClause: clause || undefined,
      landlordPromises: llP || undefined,
      tenantPromises: ttP || undefined,
      leaseStart: ls || undefined,
      leaseEnd: le || undefined,
      depositAmount: dep ? Number(dep) : undefined,
      monthlyRent: rent ? Number(rent) : undefined,
      landlordUnitCount: units ? Number(units) : undefined,
    });
    router.push('/analyzing');
  }

  const update = (id: number, p: Partial<LandlordClaim>) => setClaims(prev => prev.map(c => c.id === id ? { ...c, ...p } : c));
  const totalCharged = claims.filter(c => c.item.trim()).reduce((s, c) => s + c.amount_thb, 0);
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
            <Text style={{ fontSize: 11, color: C.amber, fontWeight: '700' }}>Step {step + 1} of 4</Text>
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
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#0C0A07' }}>{step + 1}</Text>
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
                {claims.map((c, idx) => (
                  <View key={c.id} style={{ backgroundColor: C.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: C.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 11, fontWeight: '900', color: '#0C0A07' }}>{idx + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink2 }}>Claim {idx + 1}</Text>
                      </View>
                      {claims.length > 1 && (
                        <Pressable onPress={() => setClaims(p => p.filter(r => r.id !== c.id))} hitSlop={12}
                          style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
                          <X size={11} color={C.danger} strokeWidth={2.5} />
                        </Pressable>
                      )}
                    </View>
                    <DarkInput label="Item name *" value={c.item} onChange={t => update(c.id, { item: t })} placeholder="e.g. Wall paint, sofa, floor" />
                    <DarkInput label="Landlord's reason" value={c.description} onChange={t => update(c.id, { description: t })} placeholder="What do they claim happened?" multiline />
                    <DarkInput label="Amount deducted (฿)" value={c.amount_thb > 0 ? String(c.amount_thb) : ''} onChange={t => update(c.id, { amount_thb: Number(t) || 0 })} placeholder="Enter THB amount" numeric />
                  </View>
                ))}

                <Pressable onPress={() => setClaims(p => [...p, newRow()])}
                  style={{ backgroundColor: C.surface, borderRadius: 16, paddingVertical: 16, borderWidth: 1, borderColor: C.border, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Plus size={15} color={C.blue} strokeWidth={2.5} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.blue }}>Add another claim</Text>
                </Pressable>

                {totalCharged > 0 && (
                  <View style={{ backgroundColor: C.amberSoft, borderRadius: 16, padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: C.border }}>
                    <Text style={{ fontSize: 13, color: C.ink2, fontWeight: '600' }}>Total being disputed</Text>
                    <Text style={{ fontSize: 28, fontWeight: '900', color: C.amber, letterSpacing: -1 }}>฿{totalCharged.toLocaleString()}</Text>
                  </View>
                )}
              </View>
            )}

            {/* STEP 1 */}
            {step === 1 && (
              <View style={{ gap: 16 }}>
                <View style={{ height: 100, position: 'relative', marginBottom: 4 }}>
                  <View style={{ position: 'absolute', left: 0, top: 10, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(96,165,250,0.12)' }} />
                  <View style={{ position: 'absolute', left: 60, top: 0, width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(245,158,11,0.08)' }} />
                  <View style={{ position: 'absolute', right: 0, top: 15, width: 75, height: 75, borderRadius: 37, backgroundColor: 'rgba(52,211,153,0.08)' }} />
                  <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink2 }}>AI compares Before → After</Text>
                    <Text style={{ fontSize: 11, color: C.ink3, marginTop: 2 }}>More photos = stronger evidence</Text>
                  </View>
                </View>

                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, gap: 20 }}>
                  <PhotoStrip label="Move-in photos (before tenancy)" uris={moveIn} onAdd={u => setIn(p => [...p, u])} onRemove={i => setIn(p => p.filter((_, j) => j !== i))} />
                  <View style={{ height: 1, backgroundColor: C.border2 }} />
                  <PhotoStrip label="Move-out photos (when you left)" uris={moveOut} onAdd={u => setOut(p => [...p, u])} onRemove={i => setOut(p => p.filter((_, j) => j !== i))} />
                </View>

                <View style={{ backgroundColor: 'rgba(245,158,11,0.06)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 14 }}>💡</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: C.ink2, lineHeight: 20 }}>Photos are optional but strongly recommended — they're your strongest defense against unfair deductions.</Text>
                </View>
              </View>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <View style={{ gap: 12 }}>
                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 14 }}>Rental contract</Text>
                  <DarkInput label="Relevant clause" value={clause} onChange={setClause} placeholder="Paste clause text from your lease..." multiline />
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><DarkInput label="Lease start" value={ls} onChange={setLS} placeholder="2024-01-01" /></View>
                    <View style={{ flex: 1 }}><DarkInput label="Lease end" value={le} onChange={setLE} placeholder="2024-12-31" /></View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}><DarkInput label="Deposit paid (฿)" value={dep} onChange={setDep} placeholder="20000" numeric /></View>
                    <View style={{ flex: 1 }}><DarkInput label="Monthly rent (฿)" value={rent} onChange={setRent} placeholder="10000" numeric /></View>
                  </View>
                  <DarkInput label="Landlord units (0 = unknown)" value={units} onChange={setUnits} placeholder="5 (OCPB applies at 3+)" numeric />
                </View>

                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
                  <PhotoStrip label="Chat screenshots (LINE / WhatsApp / SMS)" uris={shots} onAdd={u => setShots(p => [...p, u])} onRemove={i => setShots(p => p.filter((_, j) => j !== i))} />
                </View>

                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 14 }}>Written promises</Text>
                  <DarkInput label="Landlord said / promised" value={llP} onChange={setLLP} placeholder={'"I will return the deposit in full"'} multiline />
                  <DarkInput label="You said / promised" value={ttP} onChange={setTTP} placeholder={'"The scuff was already there at move-in"'} multiline />
                </View>
              </View>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <View style={{ gap: 12 }}>
                {/* Big summary */}
                <View style={{ backgroundColor: C.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, overflow: 'hidden', position: 'relative' }}>
                  <View style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(245,158,11,0.06)' }} />
                  <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 2, marginBottom: 6 }}>TOTAL DISPUTED</Text>
                  <Text style={{ fontSize: 48, fontWeight: '900', color: C.amber, letterSpacing: -2, lineHeight: 52, marginBottom: 20 }}>
                    ฿{totalCharged.toLocaleString()}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    {[
                      { v: claims.filter(c => c.item.trim()).length, l: 'Claims' },
                      { v: moveIn.length, l: 'Move-in' },
                      { v: moveOut.length, l: 'Move-out' },
                    ].map((s, i) => (
                      <View key={i} style={{ flex: 1, backgroundColor: C.surface2, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ fontSize: 22, fontWeight: '900', color: C.ink, letterSpacing: -0.5 }}>{s.v}</Text>
                        <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600', marginTop: 2 }}>{s.l}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Claims preview */}
                {claims.filter(c => c.item.trim()).map((c, i) => (
                  <View key={c.id} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{c.item}</Text>
                      {c.description ? <Text style={{ fontSize: 12, color: C.ink2, marginTop: 2 }} numberOfLines={1}>{c.description}</Text> : null}
                    </View>
                    <Text style={{ fontSize: 17, fontWeight: '800', color: C.amber }}>฿{c.amount_thb.toLocaleString()}</Text>
                  </View>
                ))}

                {/* AI agents */}
                <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border }}>
                  <Text style={{ fontSize: 11, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>4 AI Agents will run</Text>
                  {[
                    { n: '01', l: 'CV · Photo comparison',   c: C.blue   },
                    { n: '02', l: 'Contract · Clause parser', c: '#C084FC' },
                    { n: '03', l: 'Legal · ป.พ.พ. RAG',      c: C.ok     },
                    { n: '04', l: 'Docs · Thai PDF export',  c: C.amber  },
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
            <Text style={{ color: '#0C0A07', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>
              {step === 0 ? `Continue · ${claims.filter(c=>c.item.trim()).length} claim${claims.filter(c=>c.item.trim()).length !== 1 ? 's' : ''}` : 'Continue'}
            </Text>
            <ArrowRight size={18} color="#0C0A07" strokeWidth={2.5} />
          </Pressable>
        ) : (
          <Pressable onPress={submit}
            style={{ backgroundColor: C.amber, borderRadius: 16, paddingVertical: 17, alignItems: 'center' }}>
            <Text style={{ color: '#0C0A07', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>Analyze with AI →</Text>
          </Pressable>
        )}
        {step === 2 && (
          <Pressable onPress={() => goTo(3)} style={{ alignItems: 'center', marginTop: 12 }} hitSlop={12}>
            <Text style={{ fontSize: 13, color: C.ink3, fontWeight: '500' }}>Skip — continue without evidence</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}
