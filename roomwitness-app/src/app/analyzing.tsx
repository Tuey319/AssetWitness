import { router } from 'expo-router';
import { CheckCircle } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavHeader } from '@/components/NavHeader';
import { analyze } from '@/lib/api';
import { useStore } from '@/lib/store';

const STEPS = [
  { label: 'เปรียบเทียบภาพถ่าย', sub: 'CV · Groq Llama-4-Scout' },
  { label: 'ตรวจสอบสัญญา', sub: 'Contract Parser · Typhoon v2' },
  { label: 'วิเคราะห์กฎหมาย', sub: 'Legal RAG · ChromaDB + ป.พ.พ.' },
  { label: 'สรุปผลและเตรียมเอกสาร', sub: 'Document Generator' },
];

function Spinner() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  const rotate = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 2.5,
          borderColor: '#007AFF',
          borderTopColor: 'transparent',
        }}
      />
    </Animated.View>
  );
}

export default function AnalyzingScreen() {
  const form = useStore((s) => s.form);
  const setResult = useStore((s) => s.setResult);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!form) { router.replace('/'); return; }

    const timers = STEPS.slice(0, -1).map((_, i) =>
      setTimeout(() => setCurrentStep(i + 1), (i + 1) * 900)
    );

    analyze(form)
      .then((data) => { setResult(data); router.replace('/results'); })
      .catch((err: Error) => {
        setError(err.message || 'เกิดข้อผิดพลาด');
        timers.forEach(clearTimeout);
      });

    return () => timers.forEach(clearTimeout);
  }, []);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-bg">
        <NavHeader step={2} label="กำลังวิเคราะห์" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-unlawful-soft rounded-xl p-5 w-full mb-6 border border-unlawful/20">
            <Text className="text-unlawful-dark font-bold text-base text-center mb-1">
              เกิดข้อผิดพลาด
            </Text>
            <Text className="text-unlawful text-sm text-center leading-5">{error}</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-bg-secondary rounded-xl px-8 py-3.5 border border-separator"
            activeOpacity={0.7}
          >
            <Text className="text-navy font-semibold">กลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-bg">
      <NavHeader step={2} label="กำลังวิเคราะห์" />
      <View className="flex-1 justify-center px-6">

        {/* Hero */}
        <View className="items-center mb-10">
          <View className="w-16 h-16 rounded-full bg-primary-soft items-center justify-center mb-4">
            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
              <View className="w-3 h-3 rounded-full bg-white" />
            </View>
          </View>
          <Text className="text-2xl font-bold text-navy text-center">กำลังวิเคราะห์...</Text>
          <Text className="text-label-secondary text-base text-center mt-1">
            Analyzing your evidence
          </Text>
        </View>

        {/* Steps */}
        <View className="gap-2.5">
          {STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <View
                key={i}
                className={`flex-row items-center gap-3 p-4 rounded-xl border ${
                  done
                    ? 'bg-lawful-soft border-lawful/30'
                    : active
                    ? 'bg-primary-soft border-primary/30'
                    : 'bg-bg-secondary border-separator'
                }`}
              >
                {/* Status icon */}
                <View className="w-8 h-8 items-center justify-center">
                  {done ? (
                    <CheckCircle size={22} color="#34C759" strokeWidth={2} />
                  ) : active ? (
                    <Spinner />
                  ) : (
                    <View className="w-6 h-6 rounded-full border-2 border-separator-opaque" />
                  )}
                </View>

                <View className="flex-1">
                  <Text
                    className={`font-semibold text-sm ${
                      done ? 'text-lawful-dark' : active ? 'text-primary' : 'text-label-tertiary'
                    }`}
                  >
                    {step.label}
                  </Text>
                  <Text className="text-label-tertiary text-xs mt-0.5">{step.sub}</Text>
                </View>

                {done && (
                  <Text className="text-lawful text-xs font-semibold">เสร็จแล้ว</Text>
                )}
                {active && (
                  <Text className="text-primary text-xs font-semibold">กำลังทำ...</Text>
                )}
              </View>
            );
          })}
        </View>

        <Text className="text-label-tertiary text-xs text-center mt-8">
          ใช้เวลาประมาณ 30–90 วินาที · Takes about 30–90 seconds
        </Text>
      </View>
    </SafeAreaView>
  );
}
