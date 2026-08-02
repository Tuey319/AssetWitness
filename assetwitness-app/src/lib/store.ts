import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AnalyzeForm, CaseRecord, HandoverAnalysis, GenerateDocsResult, ConditionRecord } from './types';
import type { Theme } from './theme';

interface UserProfile {
  nameTh: string;
  nameEn: string;
  phone: string;
  language: 'th' | 'en';
}

interface Store {
  // Analysis
  form: AnalyzeForm | null;
  result: HandoverAnalysis | null;
  docsResult: GenerateDocsResult | null;
  setForm: (form: AnalyzeForm) => void;
  setResult: (result: HandoverAnalysis) => void;
  setDocsResult: (docsResult: GenerateDocsResult) => void;

  // Baseline condition vault — captured at occupancy start, persisted on-device
  // so it's still there whenever a handover is processed, even much later.
  conditionRecords: ConditionRecord[];
  addConditionRecord: (r: ConditionRecord) => void;
  removeConditionRecord: (id: string) => void;

  // Case history — one record per completed handover. Powers Home/History/Profile.
  cases: CaseRecord[];
  addCase: (c: CaseRecord) => void;

  // Theme
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  // Profile
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      form: null,
      result: null,
      docsResult: null,
      setForm: (form) => set({ form }),
      setResult: (result) => set({ result }),
      setDocsResult: (docsResult) => set({ docsResult }),

      conditionRecords: [],
      addConditionRecord: (r) => set((s) => ({ conditionRecords: [r, ...s.conditionRecords] })),
      removeConditionRecord: (id) => set((s) => ({ conditionRecords: s.conditionRecords.filter((r) => r.id !== id) })),

      cases: [],
      addCase: (c) => set((s) => ({ cases: [c, ...s.cases] })),

      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      profile: { nameTh: '', nameEn: '', phone: '', language: 'th' },
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
    }),
    {
      name: 'assetwitness-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist data that should outlive the app session (the whole point
      // of the condition vault) — not in-flight analysis state.
      partialize: (s) => ({ conditionRecords: s.conditionRecords, profile: s.profile, theme: s.theme, cases: s.cases }),
    }
  )
);

/** Convenience hook — returns current theme colors */
export { getColors } from './theme';
