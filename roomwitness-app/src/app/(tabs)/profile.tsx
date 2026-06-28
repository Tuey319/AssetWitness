import { ChevronRight, Globe, HelpCircle, Info, Moon, Scale, Shield } from 'lucide-react-native';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

function SettingsRow({
  icon: Icon,
  iconColor = '#007AFF',
  label,
  subtitle,
  onPress,
  rightElement,
}: {
  icon: typeof ChevronRight;
  iconColor?: string;
  label: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 active:bg-bg"
    >
      <View
        className="w-8 h-8 rounded-lg items-center justify-center mr-3"
        style={{ backgroundColor: `${iconColor}18` }}
      >
        <Icon size={17} color={iconColor} strokeWidth={1.75} />
      </View>
      <View className="flex-1">
        <Text className="text-navy text-sm font-medium">{label}</Text>
        {subtitle && <Text className="text-label-secondary text-xs mt-0.5">{subtitle}</Text>}
      </View>
      {rightElement ?? <ChevronRight size={16} color="#C7C7CC" strokeWidth={2} />}
    </Pressable>
  );
}

function SettingsGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      {title && (
        <Text className="text-label-secondary text-xs font-semibold uppercase tracking-wider px-4 mb-1">
          {title}
        </Text>
      )}
      <View className="bg-bg-secondary rounded-2xl overflow-hidden divide-y divide-separator-opaque">
        {children}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [thaiLang, setThaiLang] = useState(true);

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold text-navy mb-6">Profile</Text>

        {/* Avatar card */}
        <View className="bg-bg-secondary rounded-2xl p-4 mb-6 flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-full bg-primary items-center justify-center">
            <Text className="text-white text-xl font-bold">ผ</Text>
          </View>
          <View className="flex-1">
            <Text className="text-navy font-bold text-base">ผู้ใช้งาน</Text>
            <Text className="text-label-secondary text-sm">RoomWitness User</Text>
          </View>
          <View className="bg-lawful-soft rounded-lg px-2.5 py-1">
            <Text className="text-lawful-dark text-xs font-bold">Free</Text>
          </View>
        </View>

        {/* Legal sources */}
        <SettingsGroup title="Legal sources">
          <SettingsRow
            icon={Scale}
            iconColor="#007AFF"
            label="Civil & Commercial Code"
            subtitle="§§ 546–563 · Hire of Property"
          />
          <SettingsRow
            icon={Shield}
            iconColor="#34C759"
            label="OCPB Notification B.E. 2568"
            subtitle="Consumer protection · eff. 4 Sep 2025"
          />
        </SettingsGroup>

        {/* Preferences */}
        <SettingsGroup title="Preferences">
          <SettingsRow
            icon={Moon}
            iconColor="#5856D6"
            label="Dark mode"
            subtitle="Coming soon"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                disabled
              />
            }
          />
          <SettingsRow
            icon={Globe}
            iconColor="#FF9500"
            label="Primary language"
            subtitle={thaiLang ? 'ภาษาไทย + English' : 'English only'}
            rightElement={
              <Switch
                value={thaiLang}
                onValueChange={setThaiLang}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              />
            }
          />
        </SettingsGroup>

        {/* About */}
        <SettingsGroup title="About">
          <SettingsRow
            icon={Info}
            iconColor="#8E8E93"
            label="RoomWitness"
            subtitle="BDI Bangkok Hackathon 2026 · v1.0"
          />
          <SettingsRow
            icon={HelpCircle}
            iconColor="#007AFF"
            label="How it works"
            subtitle="4-agent AI pipeline"
          />
        </SettingsGroup>

        {/* Pipeline info */}
        <View className="bg-navy rounded-2xl p-4 mt-2">
          <Text className="text-white font-bold text-sm mb-3">AI Pipeline</Text>
          {[
            { n: '01', label: 'CV · Groq Llama-4-Scout', sub: 'Photo damage comparison' },
            { n: '02', label: 'Contract · Typhoon v2', sub: 'Lease clause analysis' },
            { n: '03', label: 'Legal · ChromaDB RAG', sub: 'ป.พ.พ. + สคบ. 2568' },
            { n: '04', label: 'Docs · ReportLab', sub: 'Thai legal PDF generation' },
          ].map((step) => (
            <View key={step.n} className="flex-row items-center gap-3 mb-2">
              <View className="w-7 h-7 rounded-lg bg-white/10 items-center justify-center">
                <Text className="text-white text-xs font-bold">{step.n}</Text>
              </View>
              <View>
                <Text className="text-white text-xs font-semibold">{step.label}</Text>
                <Text className="text-white/50 text-xs">{step.sub}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
