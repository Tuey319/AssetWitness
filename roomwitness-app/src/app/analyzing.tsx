import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavHeader } from '@/components/NavHeader';
import { analyze } from '@/lib/api';
import { useStore } from '@/lib/store';

const STEPS = [
  { label: 'เปรียบเทียบภาพถ่าย · CV Analysis', desc: 'Agent 1' },
  { label: 'ตรวจสอบหลักฐาน · Evidence', desc: 'Agent 2' },
  { label: 'วิเคราะห์กฎหมาย · Legal RAG', desc: 'Agent 3' },
  { label: 'สรุปผล · Done', desc: 'Agent 4' },
];

export default function AnalyzingScreen() {
  const form = useStore((s) => s.form);
  const setResult = useStore((s) => s.setResult);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
  }, [spin]);

  useEffect(() => {
    if (!form) {
      router.replace('/');
      return;
    }

    // Advance step indicator while waiting
    const timers = STEPS.slice(0, -1).map((_, i) =>
      setTimeout(() => setCurrentStep(i + 1), (i + 1) * 700)
    );

    analyze(form)
      .then((data) => {
        setResult(data);
        router.replace('/results');
      })
      .catch((err: Error) => {
        setError(err.message || 'เกิดข้อผิดพลาด / Something went wrong');
        timers.forEach(clearTimeout);
      });

    return () => timers.forEach(clearTimeout);
  }, []); // ponytail: run once on mount

  const rotation = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <NavHeader step={2} label="วิเคราะห์ · Analyzing" />
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-unlawful-soft border border-unlawful rounded-lg p-4 w-full mb-6">
            <Text className="text-unlawful font-semibold text-center">เกิดข้อผิดพลาด · Error</Text>
            <Text className="text-unlawful text-sm text-center mt-1">{error}</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()} className="bg-gray-100 rounded-lg px-6 py-3">
            <Text className="text-gray-700 font-semibold">← กลับ · Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <NavHeader step={2} label="วิเคราะห์ · Analyzing" />
      <View className="flex-1 items-center justify-center px-6">
        <View style={{ marginBottom: 24, alignItems: 'center' }}>
          <Animated.View style={{ transform: [{ rotate: rotation }] }}>
            <Text className="text-4xl">⚙️</Text>
          </Animated.View>
        </View>
        <Text className="text-xl font-bold text-gray-900 text-center mb-1">
          กำลังวิเคราะห์...
        </Text>
        <Text className="text-gray-500 text-sm text-center mb-8">Analyzing your evidence</Text>

        <View className="w-full gap-3">
          {STEPS.map((step, i) => {
            const done = i < currentStep;
            const active = i === currentStep;
            return (
              <View
                key={i}
                className={`flex-row items-center gap-3 p-3 rounded-lg border ${
                  done
                    ? 'bg-lawful-soft border-lawful'
                    : active
                    ? 'bg-primary-soft border-primary'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <Text className="text-lg w-6 text-center">
                  {done ? '✓' : active ? '◉' : '○'}
                </Text>
                <View className="flex-1">
                  <Text
                    className={`font-semibold text-sm ${
                      done ? 'text-lawful' : active ? 'text-primary' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </Text>
                  <Text className="text-gray-400 text-xs">{step.desc}</Text>
                </View>
                {done && <Text className="text-lawful font-bold text-sm">เสร็จแล้ว</Text>}
                {active && <Text className="text-primary font-bold text-sm">กำลังทำ...</Text>}
              </View>
            );
          })}
        </View>

        <Text className="text-gray-400 text-xs text-center mt-8">
          ใช้เวลาประมาณ 3-5 นาที · Takes about 3-5 minutes
        </Text>
      </View>
    </SafeAreaView>
  );
}
