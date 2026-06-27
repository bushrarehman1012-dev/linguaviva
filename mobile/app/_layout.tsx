import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDB, isLanguageSeeded, seedLanguage } from '../src/data/db';
import { LANGUAGES } from '../src/data/languageSeeds';

const SEED_FILES: Record<string, () => Promise<unknown>> = {
  ps: () => import('../src/data/seeds/ps-en.json'),
  bsk: () => import('../src/data/seeds/bsk-en.json'),
  scl: () => import('../src/data/seeds/scl-en.json'),
  hno: () => import('../src/data/seeds/hno-en.json'),
  mvy: () => import('../src/data/seeds/mvy-en.json'),
};

export default function RootLayout() {
  useEffect(() => {
    async function setup() {
      await initDB();
      for (const lang of LANGUAGES) {
        const alreadySeeded = await isLanguageSeeded(lang.code);
        if (!alreadySeeded) {
          const loader = SEED_FILES[lang.code];
          if (loader) {
            const data = (await loader()) as {
              lang_code: string;
              words: Array<{ source: string; target: string; transliteration?: string; pos?: string; category?: string }>;
              phrases: Array<{ category: string; source: string; target: string; transliteration?: string; cultural_note?: string | null }>;
            };
            await seedLanguage(data);
          }
        }
      }
    }
    setup().catch(console.error);
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="language/[code]"
        options={{ headerShown: true, headerTitle: '', headerBackTitle: 'Back' }}
      />
    </Stack>
  );
}
