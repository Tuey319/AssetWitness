import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AnalyzeForm, CaseRecord, DocsDetails, FullAnalysis, GenerateDocsResult, MoveInRecord } from './types';
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
  result: FullAnalysis | null;
  docsDetails: DocsDetails | null;
  docsResult: GenerateDocsResult | null;
  setForm: (form: AnalyzeForm) => void;
  setResult: (result: FullAnalysis) => void;
  setDocsDetails: (docsDetails: DocsDetails) => void;
  setDocsResult: (docsResult: GenerateDocsResult) => void;

  // Move-in vault — captured free at lease start, persisted on-device so it's
  // still there whenever the tenant files a claim, even up to a year later.
  moveInRecords: MoveInRecord[];
  addMoveInRecord: (r: MoveInRecord) => void;
  removeMoveInRecord: (id: string) => void;

  // Paywall — the claim flow (move-out photos + AI analysis + documents) is
  // the paid step. Reset per claim, not persisted.
  unlockedClaim: boolean;
  setUnlockedClaim: (v: boolean) => void;

  // Case history — one record per completed (paid) analysis. Powers Home/History/Profile.
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
      docsDetails: null,
      docsResult: null,
      setForm: (form) => set({ form }),
      setResult: (result) => set({ result }),
      setDocsDetails: (docsDetails) => set({ docsDetails }),
      setDocsResult: (docsResult) => set({ docsResult }),

      moveInRecords: [],
      addMoveInRecord: (r) => set((s) => ({ moveInRecords: [r, ...s.moveInRecords] })),
      removeMoveInRecord: (id) => set((s) => ({ moveInRecords: s.moveInRecords.filter((r) => r.id !== id) })),

      unlockedClaim: false,
      setUnlockedClaim: (unlockedClaim) => set({ unlockedClaim }),

      cases: [],
      addCase: (c) => set((s) => ({ cases: [c, ...s.cases] })),

      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      profile: { nameTh: '', nameEn: '', phone: '', language: 'th' },
      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
    }),
    {
      name: 'roomwitness-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist data that should outlive the app session (the whole point
      // of the move-in vault) — not in-flight analysis state or the paywall flag.
      partialize: (s) => ({ moveInRecords: s.moveInRecords, profile: s.profile, theme: s.theme, cases: s.cases }),
    }
  )
);

/** Convenience hook — returns current theme colors */
export { getColors } from './theme';
