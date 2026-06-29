import { ChevronRight, Globe, Info, Scale, Shield, Zap } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = { bg: '#0C0A07', surface: '#181410', surface2: '#221C10', ink: '#FAF8F5', ink2: 'rgba(250,248,245,0.55)', ink3: 'rgba(250,248,245,0.30)', amber: '#F59E0B', amberSoft: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.14)', border2: 'rgba(250,248,245,0.06)', blue: '#60A5FA', ok: '#34D399', purple: '#C084FC', warn: '#FBBF24' };

function Row({ icon: Icon, iconColor, label, sub, onPress }: { icon: any; iconColor: string; label: string; sub?: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: C.border2 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: iconColor + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: iconColor + '25' }}>
        <Icon size={15} color={iconColor} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{label}</Text>
        {sub && <Text style={{ fontSize: 11, color: C.ink3, marginTop: 1 }}>{sub}</Text>}
      </View>
      <ChevronRight size={15} color={C.ink3} strokeWidth={2} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 28, position: 'relative', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(245,158,11,0.05)' }} />
          <View style={{ position: 'absolute', bottom: -20, left: 20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(96,165,250,0.04)' }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28 }}>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: C.amber, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#0C0A07' }}>ผ</Text>
            </View>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '900', color: C.ink, letterSpacing: -0.5 }}>ผู้ใช้งาน</Text>
              <Text style={{ fontSize: 12, color: C.ink3 }}>RoomWitness User</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[{ v: '3', l: 'Cases' }, { v: '฿23k', l: 'Recovered' }, { v: '98%', l: 'Won' }].map((s, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.border }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: C.amber, letterSpacing: -0.5 }}>{s.v}</Text>
                <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '600', marginTop: 2 }}>{s.l}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Legal database */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>Legal database</Text>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            <Row icon={Scale} iconColor={C.blue} label="Civil & Commercial Code" sub="§§ 546–563 · Hire of Property" />
            <Row icon={Shield} iconColor={C.ok} label="OCPB Notification B.E. 2568" sub="Consumer protection · eff. 4 Sep 2025" />
          </View>
        </View>

        {/* AI pipeline */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 10, color: C.ink3, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>AI pipeline</Text>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            {[
              { n: '01', l: 'CV · Groq Llama-4-Scout',     s: 'Photo damage comparison',   c: C.blue   },
              { n: '02', l: 'Contract · Typhoon v2',        s: 'Lease clause analysis',     c: C.purple },
              { n: '03', l: 'Legal RAG · ChromaDB',         s: 'ป.พ.พ. §546-563 + OCPB 2568', c: C.ok  },
              { n: '04', l: 'Docs · ReportLab',             s: 'Thai legal PDF generation', c: C.amber  },
            ].map((a, i) => (
              <View key={a.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: C.border2 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: a.c + '18', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: a.c + '30' }}>
                  <Text style={{ fontSize: 10, fontWeight: '900', color: a.c }}>{a.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{a.l}</Text>
                  <Text style={{ fontSize: 11, color: C.ink3 }}>{a.s}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* About */}
        <View style={{ paddingHorizontal: 20, marginBottom: 28 }}>
          <View style={{ backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
            <Row icon={Zap} iconColor={C.warn} label="About RoomWitness" sub="BDI Bangkok Hackathon 2026 · v1.0" />
            <Row icon={Globe} iconColor={C.ok} label="OCPB Complaint Portal" sub="ocpb.go.th · call 1166" />
            <Row icon={Info} iconColor={C.blue} label="How it works" sub="4-agent AI pipeline · Thai law RAG" />
          </View>
        </View>

        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 11, color: C.ink3 }}>BDI Bangkok Hackathon 2026</Text>
          <Text style={{ fontSize: 11, color: C.ink3 }}>Team: KP · Beam · Tuey</Text>
          <View style={{ marginTop: 6, backgroundColor: C.amberSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 10, color: C.amber, fontWeight: '700' }}>Powered by Thai Law AI</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
