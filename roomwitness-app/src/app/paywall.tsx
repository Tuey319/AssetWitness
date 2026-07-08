import { router } from 'expo-router';
import { Camera, CheckCircle2, ChevronLeft, FileText, Lock, Scale, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '@/lib/store';
import { getColors } from '@/lib/theme';

const INCLUDED = [
  { icon: Camera,   label: 'AI photo comparison (move-in vs move-out)' },
  { icon: Scale,    label: 'Thai legal classification per claim (ป.พ.พ. + OCPB)' },
  { icon: FileText, label: '3 ready-to-file documents: OCPB complaint, demand letter, evidence summary' },
];

export default function PaywallScreen() {
  const C = getColors(useStore(s => s.theme));
  const form = useStore(s => s.form);
  const setUnlockedClaim = useStore(s => s.setUnlockedClaim);
  const [paying, setPaying] = useState(false);

  const claimCount = form?.claims.length ?? 0;
  const totalCharged = form?.claims.reduce((s, c) => s + c.amount_thb, 0) ?? 0;

  function pay() {
    setPaying(true);
    // No real payment provider wired up yet — this is a demo stand-in for the
    // "pay only when you actually file a claim" gate described in the pitch.
    setTimeout(() => {
      setUnlockedClaim(true);
      router.replace('/analyzing');
    }, 900);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 }}>
        <Pressable onPress={() => router.back()} hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: C.surface, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: C.border }}>
          <ChevronLeft size={14} color={C.ink2} strokeWidth={2.5} />
          <Text style={{ fontSize: 12, color: C.ink2, fontWeight: '600' }}>Back</Text>
        </Pressable>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 20, justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: C.amberSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
            <Lock size={26} color={C.amber} strokeWidth={2} />
          </View>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.ink, letterSpacing: -1, textAlign: 'center' }}>
            You're filing a real claim
          </Text>
          <Text style={{ fontSize: 13, color: C.ink2, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
            Downloading, saving move-in photos, and entering claims are always free.{'\n'}
            This is the one step that costs money — running the AI and generating your documents.
          </Text>
        </View>

        <View style={{ backgroundColor: C.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ fontSize: 13, color: C.ink2, fontWeight: '600' }}>
              {claimCount} claim{claimCount !== 1 ? 's' : ''} · ฿{totalCharged.toLocaleString()} disputed
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Sparkles size={12} color={C.amber} strokeWidth={2} />
              <Text style={{ fontSize: 11, color: C.amber, fontWeight: '700' }}>ONE-TIME</Text>
            </View>
          </View>
          <Text style={{ fontSize: 40, fontWeight: '900', color: C.ink, letterSpacing: -2, marginBottom: 16 }}>฿99</Text>
          {INCLUDED.map((f, i) => {
            const Icon = f.icon;
            return (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: i < INCLUDED.length - 1 ? 12 : 0 }}>
                <Icon size={16} color={C.ok} strokeWidth={2} />
                <Text style={{ flex: 1, fontSize: 13, color: C.ink2, lineHeight: 18 }}>{f.label}</Text>
              </View>
            );
          })}
        </View>

        <Pressable onPress={pay} disabled={paying}
          style={{ backgroundColor: C.amber, borderRadius: 16, paddingVertical: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: paying ? 0.7 : 1 }}>
          <CheckCircle2 size={18} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.3 }}>
            {paying ? 'Processing…' : 'Pay ฿99 & analyze'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
