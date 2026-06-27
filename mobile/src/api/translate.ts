import client from './backendClient';

export interface TranslationResult {
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

export async function translate(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<TranslationResult> {
  if (!text.trim()) return { translation: '', source: 'none' };

  const response = await client.post<{ translation: string; source: string }>('/api/translate', {
    text: text.trim(),
    sourceLang,
    targetLang,
  });

  const { translation, source } = response.data;
  return {
    translation: translation || '',
    source: (source as TranslationResult['source']) || 'none',
  };
}

export async function getPhrases(langCode: string, category: string): Promise<Phrase[]> {
  const response = await client.get<{ phrases: Phrase[] }>(`/api/phrases/${langCode}/${category}`);
  return response.data.phrases ?? [];
}

export async function getVocabulary(langCode: string, category: string): Promise<VocabWord[]> {
  const response = await client.get<{ words: VocabWord[] }>(`/api/vocabulary/${langCode}`, {
    params: { category },
  });
  return response.data.words ?? [];
}
