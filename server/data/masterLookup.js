// Cross-language lookup table. Every row is a concept; every column is a language.
// Enables direct any-source → any-target lookup without AI involvement.

let _table = null;

// Per-language indexes: Map of normalized text → entry
const _indexes = {};

function buildIndexes() {
  if (_table) return;
  try {
    _table = require('./master_wordlist.json');
  } catch {
    _table = { entries: [] };
    return;
  }

  for (const entry of _table.entries) {
    // Index English
    _index('en', (entry.en || '').toLowerCase().trim(), entry);

    // Index Urdu (exact word match)
    if (entry.ur) _index('ur', entry.ur.trim(), entry);

    // Index each language field
    for (const lang of ['ps', 'bsk', 'scl', 'hno', 'mvy', 'khw', 'bft', 'wbl', 'trw', 'kls']) {
      const data = entry[lang];
      if (!data) continue;
      if (data.word) _index(lang, data.word.trim().toLowerCase(), entry);
      if (data.roman && data.roman !== data.word) _index(lang, data.roman.trim().toLowerCase(), entry);
    }
  }
}

function _index(lang, key, entry) {
  if (!key) return;
  if (!_indexes[lang]) _indexes[lang] = new Map();
  if (!_indexes[lang].has(key)) _indexes[lang].set(key, entry);
}

/**
 * Look up a word/phrase in the master table.
 * Returns { word, roman, notes? } for the target language, or null if not found.
 */
function masterLookup(text, sourceLang, targetLang) {
  buildIndexes();

  const key = (sourceLang === 'ur') ? text.trim() : text.trim().toLowerCase();

  const idx = _indexes[sourceLang];
  if (!idx) return null;

  const entry = idx.get(key);
  if (!entry) return null;

  // Retrieve target
  if (targetLang === 'en') return { word: entry.en, roman: entry.en };
  if (targetLang === 'ur') return { word: entry.ur, roman: entry.ur };

  const targetData = entry[targetLang];
  if (!targetData) return null;

  return {
    word: targetData.word,
    roman: targetData.roman,
    notes: targetData.notes || null,
    pos: entry.pos,
    category: entry.category,
  };
}

/**
 * Returns context string for Gemini prompt injection.
 * Returns null if no match found.
 */
function getMasterContext(text, sourceLang, targetLang) {
  buildIndexes();

  const words = sourceLang === 'ur'
    ? text.trim().split(/[\s،,؛;]+/).filter(w => w.length > 1)
    : text.trim().toLowerCase().split(/\W+/).filter(w => w.length > 1);

  const seen = new Set();
  const lines = [];

  // Exact full-phrase lookup first
  const fullKey = (sourceLang === 'ur') ? text.trim() : text.trim().toLowerCase();
  const exactEntry = (_indexes[sourceLang] || new Map()).get(fullKey);
  if (exactEntry) {
    const t = targetLang === 'en' ? { word: exactEntry.en } :
              targetLang === 'ur' ? { word: exactEntry.ur } :
              exactEntry[targetLang];
    if (t?.word) {
      return {
        isExact: true,
        translation: t.word,
        roman: t.roman || t.word,
        pos: exactEntry.pos,
      };
    }
  }

  // Partial word matches
  for (const word of words) {
    const entry = (_indexes[sourceLang] || new Map()).get(word);
    if (!entry || seen.has(entry.id)) continue;
    seen.add(entry.id);

    const t = targetLang === 'en' ? { word: entry.en } :
              targetLang === 'ur' ? { word: entry.ur } :
              entry[targetLang];
    if (!t?.word) continue;

    const srcWord = sourceLang === 'en' ? entry.en :
                    sourceLang === 'ur' ? entry.ur :
                    entry[sourceLang]?.word || word;

    lines.push(`"${srcWord}" → "${t.word}" (${t.roman || t.word})`);
    if (lines.length >= 6) break;
  }

  if (lines.length === 0) return null;
  return {
    isExact: false,
    context: `\nVerified cross-language dictionary matches:\n${lines.join('\n')}\nUse these exact forms where applicable.\n`,
  };
}

module.exports = { masterLookup, getMasterContext };
