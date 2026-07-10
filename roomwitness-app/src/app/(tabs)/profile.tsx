import { ExternalLink, ChevronRight, Globe, Info, Moon, Save, Sun, User, Zap } from 'lucide-react-native';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, Pressable, ScrollView,
  Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getColors } from '@/lib/theme';
import { useStore } from '@/lib/store';

// ─── AI Pipeline data ────────────────────────────────────────────────
const AGENTS = [
  {
    id:       '01',
    name:     'CV Damage Assessment',
    model:    'meta-llama/llama-4-scout-17b-16e-instruct',
    provider: 'Groq Cloud',
    type:     'Vision + Text',
    context:  '128K tokens',
    latency:  '2.3s avg',
    color:    '#60A5FA',
    status:   'online' as const,
    calls:    142,
    desc:     'Compares move-in vs move-out photos using multi-image reasoning. Detects change type: PRE_EXISTING, NORMAL_WEAR, UNCHANGED, NEW_DAMAGE.',
    tags:     ['Vision', 'Groq', 'Llama-4'],
  },
  {
    id:       '02',
    name:     'Contract Parser',
    model:    'typhoon-v2.5-30b-a3b-instruct',
    provider: 'OpenTyphoon',
    type:     'Thai legal text',
    context:  '8K tokens',
    latency:  '8.1s avg',
    color:    '#C084FC',
    status:   'online' as const,
    calls:    138,
    desc:     'Extracts liability_map, contract_summary, and unfair_clauses from Thai lease PDFs. Detects OCPB 2568 violations and void clauses.',
    tags:     ['Thai NLP', 'Typhoon', 'Legal'],
  },
  {
    id:       '03',
    name:     'Legal Reasoning RAG',
    model:    'typhoon-v2.5-30b-a3b-instruct + ChromaDB',
    provider: 'OpenTyphoon + Local',
    type:     'RAG · 21 law chunks',
    context:  'Top-3 retrieval',
    latency:  '6.2s avg',
    color:    '#34D399',
    status:   'online' as const,
    calls:    274,
    desc:     'Retrieves relevant Thai law via ChromaDB semantic search, then reasons per-claim verdict: LAWFUL / DISPUTED / UNLAWFUL. Cites ป.พ.พ. §546–563 + OCPB 2568.',
    tags:     ['RAG', 'ChromaDB', 'ONNX embed'],
  },
  {
    id:       '04',
    name:     'Document Generator',
    model:    'typhoon-v2.5-30b-a3b-instruct + ReportLab',
    provider: 'OpenTyphoon + Python',
    type:     'Thai PDF · 3 doc types',
    context:  'Platypus layout engine',
    latency:  '4.1s avg',
    color:    '#F59E0B',
    status:   'online' as const,
    calls:    127,
    desc:     'Generates OCPB complaint, deposit demand letter, and evidence summary as Thai-language PDFs using ReportLab Platypus with Leelawadee font.',
    tags:     ['ReportLab', 'Thai PDF', 'Leelawadee'],
  },
];

const LEGAL_DB = [
  {
    title:   'Civil & Commercial Code',
    detail:  '§§ 546–563 · Hire of Property',
    chunks:  11,
    color:   '#60A5FA',
    sources: [
      { label: 'Thailand Law Library §537–545', url: 'https://library.siam-legal.com/thai-law/civil-and-commercial-code-exchange-section-537-545/' },
      { label: 'Thailand Law Library §552–563', url: 'https://library.siam-legal.com/thai-law/civil-and-commercial-code-exchange-section-552-563/' },
      { label: 'Thailand Law Online Overview',  url: 'https://www.thailandlawonline.com/civil-and-commercial-code/537-571-lease-or-hire-of-property-laws' },
    ],
  },
  {
    title:   'OCPB Notification B.E. 2568',
    detail:  'Consumer protection · eff. 4 Sep 2025',
    chunks:  10,
    color:   '#34D399',
    sources: [
      { label: 'OCPB Official Announcement',      url: 'https://www.ocpb.go.th/news_view.php?nid=17156' },
      { label: 'Lex Nova — Plain-English Summary', url: 'https://lexnovapartners.com/residential-lease-contracts/' },
      { label: 'Formichella & Sritawat Analysis', url: 'https://fosrlaw.com/2025/thailand-residential-leasing-regulations-2025/' },
      { label: 'Landager — Deposit Rules',        url: 'https://landager.com/en/property-compliance/thailand/national/security-deposits' },
    ],
  },
];

// ─── Pulse dot for "online" status ───────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.8, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 900, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    ])).start();
  }, []);
  return (
    <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color, opacity, transform: [{ scale }], pointerEvents: 'none' }} />
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

// ─── Expandable agent card ────────────────────────────────────────────
function AgentCard({ agent, C }: { agent: typeof AGENTS[0]; C: ReturnType<typeof getColors> }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Pressable onPress={() => setExpanded(v => !v)} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: agent.color + '18', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: agent.color }}>{agent.id}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink, flexShrink: 1 }} numberOfLines={1}>{agent.name}</Text>
            <PulseDot color={agent.color} />
          </View>

          {/* Model name — monospace */}
          <Text style={{ fontSize: 10, color: C.ink3, fontFamily: 'IBMPlexMono_500Medium', marginBottom: 8 }} numberOfLines={1}>
            {agent.model}
          </Text>

          {/* Metric strip — plain text, no pills */}
          <Text style={{ fontSize: 11, color: C.ink3 }}>
            {agent.provider} · {agent.latency} · {agent.calls} calls
          </Text>
        </View>

        <Text style={{ fontSize: 13, color: C.ink3, marginTop: 2 }}>{expanded ? '▲' : '▼'}</Text>
      </View>

      {/* Expanded detail */}
      {expanded && (
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border2, gap: 10 }}>
          <Text style={{ fontSize: 13, color: C.ink2, lineHeight: 20 }}>{agent.desc}</Text>

          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
            {agent.tags.map(t => (
              <View key={t} style={{ backgroundColor: C.surface2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink2 }}>{t}</Text>
              </View>
            ))}
          </View>

          <View style={{ backgroundColor: C.surface2, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 }}>CONTEXT</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>{agent.context} · {agent.type}</Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────
function SettingsRow({ icon: Icon, iconColor, label, sub, onPress, right }: {
  icon: any; iconColor: string; label: string; sub?: string;
  onPress?: () => void; right?: React.ReactNode;
}) {
  const C = getColors(useStore(s => s.theme));
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconColor + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: iconColor + '25' }}>
        <Icon size={15} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{label}</Text>
        {sub && <Text style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>{sub}</Text>}
      </View>
      {right ?? <ChevronRight size={15} color={C.ink3} strokeWidth={2} />}
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const theme       = useStore(s => s.theme);
  const toggleTheme = useStore(s => s.toggleTheme);
  const profile     = useStore(s => s.profile);
  const setProfile  = useStore(s => s.setProfile);
  const cases       = useStore(s => s.cases);
  const C           = getColors(theme);
  const isDark      = theme === 'dark';

  const totalRecovered = cases.reduce((s, c) => s + c.totalRecoverable, 0);
  const winRate = cases.length > 0 ? Math.round(cases.filter(c => c.verdict !== 'LAWFUL').length / cases.length * 100) : 0;

  const [editing, setEditing] = useState(false);
  const [nameTh, setNameTh]   = useState(profile.nameTh);
  const [nameEn, setNameEn]   = useState(profile.nameEn);
  const [phone, setPhone]     = useState(profile.phone);
  const [language, setLang]   = useState<'th' | 'en'>(profile.language);

  function save() {
    setProfile({ nameTh, nameEn, phone, language });
    setEditing(false);
    Alert.alert('Saved ✓', 'Profile updated.');
  }

  const totalCalls = AGENTS.reduce((s, a) => s + a.calls, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* ── Profile card ──────────────────────────── */}
        <View style={{ backgroundColor: C.surface, marginHorizontal: 20, marginTop: 24, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: C.border, marginBottom: 24, overflow: 'hidden', position: 'relative' }}>
          <View style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: 65, backgroundColor: C.amberGlow, pointerEvents: 'none' }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: editing ? 16 : 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.amberDark, alignItems: 'center', justifyContent: 'center' }}>
                {profile.nameTh
                  ? <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF' }}>{profile.nameTh.charAt(0)}</Text>
                  : <User size={22} color="#FFFFFF" strokeWidth={2.5} />}
              </View>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink }}>{profile.nameTh || 'Your Name'}</Text>
                <Text style={{ fontSize: 12, color: C.ink3 }}>{profile.nameEn || 'Tap Edit to set up'}</Text>
                {profile.phone ? <Text style={{ fontSize: 11, color: C.ink3 }}>{profile.phone}</Text> : null}
              </View>
            </View>
            <Pressable
              onPress={() => editing ? save() : setEditing(true)}
              style={{ backgroundColor: editing ? C.amber : C.amberSoft, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', gap: 5 }}
            >
              {editing && <Save size={12} color="#FFFFFF" strokeWidth={2.5} />}
              <Text style={{ fontSize: 12, color: editing ? '#FFFFFF' : C.amber, fontWeight: '700' }}>{editing ? 'Save' : 'Edit'}</Text>
            </Pressable>
          </View>

          {editing ? (
            <View style={{ gap: 8 }}>
              {[
                { label: 'Name (Thai)', value: nameTh, set: setNameTh, ph: 'สมชาย ใจดี' },
                { label: 'Name (English)', value: nameEn, set: setNameEn, ph: 'Somchai Jaidee' },
                { label: 'Phone', value: phone, set: setPhone, ph: '08-1234-5678' },
              ].map(f => (
                <View key={f.label}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>{f.label}</Text>
                  <TextInput value={f.value} onChangeText={f.set} placeholder={f.ph} placeholderTextColor={C.ink3}
                    style={{ backgroundColor: C.surface2, borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: C.ink }} />
                </View>
              ))}
              <Pressable onPress={() => setEditing(false)} style={{ alignItems: 'center', paddingVertical: 8 }}>
                <Text style={{ fontSize: 13, color: C.ink3 }}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { v: String(cases.length), l: 'Cases' },
                { v: totalRecovered >= 1000 ? `฿${Math.round(totalRecovered / 1000)}k` : `฿${totalRecovered}`, l: 'Recovered' },
                { v: cases.length > 0 ? `${winRate}%` : '—', l: 'Won' },
              ].map((s, i) => (
                <View key={i} style={{ flex: 1, backgroundColor: C.surface2, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: C.border2 }}>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: C.amberDark }}>{s.v}</Text>
                  <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600', marginTop: 2 }}>{s.l}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Appearance ────────────────────────────── */}
        <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 20 }}>Appearance</Text>
        <View style={{ backgroundColor: C.surface, borderRadius: 20, marginHorizontal: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 24 }}>
          <SettingsRow icon={isDark ? Moon : Sun} iconColor={C.amber}
            label={isDark ? 'Dark mode' : 'Light mode'}
            sub={isDark ? 'Warm dark amber theme' : 'Clean light theme'}
            right={<Switch value={isDark} onValueChange={toggleTheme} trackColor={{ false: C.border2, true: C.amber }} thumbColor="#fff" />}
          />
          <SettingsRow icon={Globe} iconColor={C.blue} label="Language"
            sub={language === 'th' ? 'ภาษาไทย + English' : 'English only'}
            right={
              <Pressable onPress={() => { const n = language === 'th' ? 'en' : 'th'; setLang(n); setProfile({ language: n }); }}
                style={{ backgroundColor: C.blueBg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: C.blue + '30' }}>
                <Text style={{ fontSize: 12, color: C.blue, fontWeight: '700' }}>{language === 'th' ? 'TH + EN' : 'EN only'}</Text>
              </Pressable>
            }
          />
        </View>

        {/* ── Legal database ────────────────────────── */}
        <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 20 }}>Legal database</Text>
        <View style={{ marginHorizontal: 20, marginBottom: 24, gap: 8 }}>
          {LEGAL_DB.map(db => (
            <View key={db.title} style={{ backgroundColor: C.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                  <PulseDot color={db.color} />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink, flex: 1 }}>{db.title}</Text>
                </View>
                <View style={{ backgroundColor: C.surface2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.ink2 }}>{db.chunks} chunks</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: C.ink3, marginBottom: 12 }}>{db.detail}</Text>
              {/* Source links */}
              <View style={{ gap: 6 }}>
                {db.sources.map(s => (
                  <Pressable
                    key={s.url}
                    onPress={() => WebBrowser.openBrowserAsync(s.url)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surface2, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 }}
                  >
                    <ExternalLink size={11} color={C.ink2} strokeWidth={2} />
                    <Text style={{ fontSize: 11, color: C.ink2, fontWeight: '600', flex: 1 }} numberOfLines={1}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* ── AI Pipeline ───────────────────────────── */}
        <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' }}>AI Pipeline</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
                <PulseDot color={C.ok} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: C.ok }}>All systems online</Text>
              </View>
            </View>
          </View>

          {/* System metrics strip */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {[
              { l: 'Total calls', v: String(totalCalls) },
              { l: 'Avg latency', v: '5.2s' },
              { l: 'Agents', v: '4 active' },
            ].map(s => (
              <View key={s.l} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 0.5, marginBottom: 3 }}>{s.l.toUpperCase()}</Text>
                <Text style={{ fontSize: 15, fontWeight: '900', color: C.amberDark }}>{s.v}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 11, color: C.ink3, marginBottom: 12 }}>Tap any agent to expand details</Text>

          {AGENTS.map(agent => <AgentCard key={agent.id} agent={agent} C={C} />)}
        </View>

        {/* ── About ────────────────────────────────── */}
        <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10, paddingHorizontal: 20 }}>About</Text>
        <View style={{ backgroundColor: C.surface, borderRadius: 20, marginHorizontal: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 28 }}>
          <SettingsRow icon={Zap} iconColor={C.warn} label="RoomWitness v1.0" sub="BDI Bangkok Hackathon 2026" />
          <SettingsRow icon={Globe} iconColor={C.ok} label="OCPB Complaint Portal" sub="ocpb.go.th · call 1166" onPress={() => WebBrowser.openBrowserAsync('https://www.ocpb.go.th')} />
          <SettingsRow icon={Info} iconColor={C.blue} label="Built with" sub="Expo · Groq · Typhoon v2 · ChromaDB · ReportLab" />
        </View>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, color: C.ink3 }}>BDI Bangkok Hackathon 2026 · Team: KP · Beam · Tuey</Text>
          <View style={{ marginTop: 6, backgroundColor: C.amberSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 10, color: C.amberDark, fontWeight: '700' }}>Powered by Thai Law AI</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
