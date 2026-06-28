import { create } from 'zustand';
import type { AnalyzeForm, FullAnalysis } from './types';

interface Store {
  form: AnalyzeForm | null;
  result: FullAnalysis | null;
  setForm: (form: AnalyzeForm) => void;
  setResult: (result: FullAnalysis) => void;
}

export const useStore = create<Store>((set) => ({
  form: null,
  result: null,
  setForm: (form) => set({ form }),
  setResult: (result) => set({ result }),
}));
