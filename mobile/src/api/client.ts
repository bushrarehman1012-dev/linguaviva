import axios from 'axios';
import { Platform } from 'react-native';

const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'
    : 'http://localhost:3001';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

export interface TranslateResponse {
  translation: string;
  source: 'ai' | 'ai_cached' | 'none';
}

export interface Phrase {
  english: string;
  translation: string;
  transliteration: string;
  note: string;
}

export interface VocabWord {
  english: string;
  translation: string;
  transliteration: string;
  partOfSpeech: string;
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslateResponse> {
  const res = await client.post<TranslateResponse>('/api/translate', {
    text,
    sourceLang,
    targetLang,
  });
  return res.data;
}

export async function fetchPhrases(langCode: string, category: string): Promise<Phrase[]> {
  const res = await client.get<{ phrases: Phrase[] }>(`/api/phrases/${langCode}/${category}`);
  return res.data.phrases;
}

export async function fetchVocabulary(langCode: string, category: string): Promise<VocabWord[]> {
  const res = await client.get<{ words: VocabWord[] }>(`/api/vocabulary/${langCode}`, {
    params: { category },
  });
  return res.data.words;
}

export async function fetchLanguages() {
  const res = await client.get('/api/languages');
  return res.data;
}
