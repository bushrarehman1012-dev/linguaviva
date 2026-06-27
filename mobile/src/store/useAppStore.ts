import { create } from 'zustand';

export interface TranslationEntry {
  id: string;
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  translation: string;
  source: 'ai' | 'ai_cached' | 'dictionary' | 'none';
  timestamp: number;
}

interface AppStore {
  sourceLang: string;
  targetLang: string;
  translationHistory: TranslationEntry[];
  selectedLanguageCode: string | null;
  setSourceLang: (code: string) => void;
  setTargetLang: (code: string) => void;
  swapLanguages: () => void;
  addToHistory: (entry: Omit<TranslationEntry, 'id' | 'timestamp'>) => void;
  setSelectedLanguage: (code: string | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  sourceLang: 'en',
  targetLang: 'ps',
  translationHistory: [],
  selectedLanguageCode: null,

  setSourceLang: (code) => set({ sourceLang: code }),
  setTargetLang: (code) => set({ targetLang: code }),
  swapLanguages: () =>
    set((state) => ({ sourceLang: state.targetLang, targetLang: state.sourceLang })),

  addToHistory: (entry) =>
    set((state) => ({
      translationHistory: [
        { ...entry, id: Date.now().toString(), timestamp: Date.now() },
        ...state.translationHistory,
      ].slice(0, 20),
    })),

  setSelectedLanguage: (code) => set({ selectedLanguageCode: code }),
}));
