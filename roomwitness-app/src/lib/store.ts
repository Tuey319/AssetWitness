import { create } from 'zustand';
import type { AnalyzeForm, DocsDetails, FullAnalysis, GenerateDocsResult } from './types';
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

  // Theme
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;

  // Profile
  profile: UserProfile;
  setProfile: (p: Partial<UserProfile>) => void;
}

export const useStore = create<Store>((set) => ({
  form: null,
  result: null,
  docsDetails: null,
  docsResult: null,
  setForm: (form) => set({ form }),
  setResult: (result) => set({ result }),
  setDocsDetails: (docsDetails) => set({ docsDetails }),
  setDocsResult: (docsResult) => set({ docsResult }),

  theme: 'light',
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

  profile: { nameTh: '', nameEn: '', phone: '', language: 'th' },
  setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
}));

/** Convenience hook — returns current theme colors */
export { getColors } from './theme';
