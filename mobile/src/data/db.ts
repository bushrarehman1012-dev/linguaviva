import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function initDB(): Promise<void> {
  db = await SQLite.openDatabaseAsync('linguaviva.db');
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dictionary (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lang_code TEXT NOT NULL,
      source_word TEXT NOT NULL,
      target_word TEXT NOT NULL,
      transliteration TEXT,
      part_of_speech TEXT,
      category TEXT,
      example_source TEXT,
      example_target TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_dict_lang_source ON dictionary(lang_code, source_word);

    CREATE TABLE IF NOT EXISTS phrases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lang_code TEXT NOT NULL,
      category TEXT NOT NULL,
      source_text TEXT NOT NULL,
      target_text TEXT NOT NULL,
      transliteration TEXT,
      cultural_note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_phrases_lang ON phrases(lang_code, category);

    CREATE TABLE IF NOT EXISTS flashcard_progress (
      lang_code TEXT NOT NULL,
      dictionary_id INTEGER NOT NULL,
      box INTEGER DEFAULT 1,
      next_review INTEGER DEFAULT 0,
      last_reviewed INTEGER DEFAULT 0,
      PRIMARY KEY (lang_code, dictionary_id)
    );

    CREATE TABLE IF NOT EXISTS seeded_languages (
      lang_code TEXT PRIMARY KEY,
      seeded_at INTEGER NOT NULL
    );
  `);
}

export async function isLanguageSeeded(langCode: string): Promise<boolean> {
  if (!db) throw new Error('DB not initialized');
  const row = await db.getFirstAsync<{ lang_code: string }>(
    'SELECT lang_code FROM seeded_languages WHERE lang_code = ?',
    [langCode]
  );
  return row !== null;
}

export async function seedLanguage(data: {
  lang_code: string;
  words: Array<{
    source: string;
    target: string;
    transliteration?: string;
    pos?: string;
    category?: string;
  }>;
  phrases: Array<{
    category: string;
    source: string;
    target: string;
    transliteration?: string;
    cultural_note?: string | null;
  }>;
}): Promise<void> {
  if (!db) throw new Error('DB not initialized');
  await db.withTransactionAsync(async () => {
    for (const w of data.words) {
      await db!.runAsync(
        `INSERT OR IGNORE INTO dictionary (lang_code, source_word, target_word, transliteration, part_of_speech, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.lang_code, w.source.toLowerCase(), w.target, w.transliteration ?? null, w.pos ?? null, w.category ?? null]
      );
    }
    for (const p of data.phrases) {
      await db!.runAsync(
        `INSERT OR IGNORE INTO phrases (lang_code, category, source_text, target_text, transliteration, cultural_note)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [data.lang_code, p.category, p.source, p.target, p.transliteration ?? null, p.cultural_note ?? null]
      );
    }
    await db!.runAsync(
      'INSERT OR REPLACE INTO seeded_languages (lang_code, seeded_at) VALUES (?, ?)',
      [data.lang_code, Date.now()]
    );
  });
}

export async function searchDictionary(
  langCode: string,
  query: string,
  limit = 5
): Promise<Array<{ id: number; source_word: string; target_word: string; transliteration: string | null; category: string | null }>> {
  if (!db) throw new Error('DB not initialized');
  const normalized = query.toLowerCase().trim();
  return db.getAllAsync(
    `SELECT id, source_word, target_word, transliteration, category
     FROM dictionary
     WHERE lang_code = ? AND source_word LIKE ?
     ORDER BY CASE WHEN source_word = ? THEN 0 ELSE 1 END
     LIMIT ?`,
    [langCode, `${normalized}%`, normalized, limit]
  );
}

export async function getPhrases(
  langCode: string,
  category?: string
): Promise<Array<{ id: number; category: string; source_text: string; target_text: string; transliteration: string | null; cultural_note: string | null }>> {
  if (!db) throw new Error('DB not initialized');
  if (category) {
    return db.getAllAsync(
      'SELECT * FROM phrases WHERE lang_code = ? AND category = ? ORDER BY id',
      [langCode, category]
    );
  }
  return db.getAllAsync('SELECT * FROM phrases WHERE lang_code = ? ORDER BY category, id', [langCode]);
}

export async function getDictionaryWords(
  langCode: string,
  limit = 50
): Promise<Array<{ id: number; source_word: string; target_word: string; transliteration: string | null; category: string | null }>> {
  if (!db) throw new Error('DB not initialized');
  return db.getAllAsync(
    'SELECT id, source_word, target_word, transliteration, category FROM dictionary WHERE lang_code = ? LIMIT ?',
    [langCode, limit]
  );
}

export async function getFlashcardProgress(
  langCode: string,
  dictionaryId: number
): Promise<{ box: number; next_review: number } | null> {
  if (!db) throw new Error('DB not initialized');
  return db.getFirstAsync(
    'SELECT box, next_review FROM flashcard_progress WHERE lang_code = ? AND dictionary_id = ?',
    [langCode, dictionaryId]
  );
}

export async function updateFlashcardProgress(
  langCode: string,
  dictionaryId: number,
  box: number
): Promise<void> {
  if (!db) throw new Error('DB not initialized');
  const intervals = [0, 1, 3, 7, 14, 30];
  const days = intervals[Math.min(box, intervals.length - 1)];
  const nextReview = Date.now() + days * 24 * 60 * 60 * 1000;
  await db.runAsync(
    `INSERT INTO flashcard_progress (lang_code, dictionary_id, box, next_review, last_reviewed)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(lang_code, dictionary_id) DO UPDATE SET box=excluded.box, next_review=excluded.next_review, last_reviewed=excluded.last_reviewed`,
    [langCode, dictionaryId, box, nextReview, Date.now()]
  );
}

export async function getDueFlashcards(
  langCode: string
): Promise<Array<{ id: number; source_word: string; target_word: string; transliteration: string | null; box: number }>> {
  if (!db) throw new Error('DB not initialized');
  const now = Date.now();
  return db.getAllAsync(
    `SELECT d.id, d.source_word, d.target_word, d.transliteration,
            COALESCE(fp.box, 1) as box
     FROM dictionary d
     LEFT JOIN flashcard_progress fp ON fp.lang_code = d.lang_code AND fp.dictionary_id = d.id
     WHERE d.lang_code = ? AND (fp.next_review IS NULL OR fp.next_review <= ?)
     LIMIT 20`,
    [langCode, now]
  );
}