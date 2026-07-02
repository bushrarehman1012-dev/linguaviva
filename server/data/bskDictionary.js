// Runtime loader for the Burushaski Research Academy dictionary (Vol. 2, dal-ghain).
// Builds an inverted index at startup: English keyword → dictionary entries.
// Used to inject verified Burushaski vocabulary into Gemini prompts.

let _index = null;       // English keyword → [{transliteration, bsk, english}]
let _phraseIndex = null; // full English phrase → {transliteration, bsk}
let _urduIndex = null;   // Urdu keyword → [{transliteration, bsk, urdu}]

function buildIndex() {
  if (_index) return;
  _index = new Map();
  _phraseIndex = new Map();
  _urduIndex = new Map();

  let entries;
  try {
    entries = require('./bsk_dictionary.json').entries;
  } catch {
    _index = new Map(); _phraseIndex = new Map(); _urduIndex = new Map();
    return;
  }

  for (const entry of entries) {
    if (!entry.transliteration) continue;

    // English index
    if (entry.english && !entry.english.startsWith('see ') && !entry.english.startsWith('plural')) {
      const phrase = entry.english.toLowerCase().trim();
      _phraseIndex.set(phrase, { transliteration: entry.transliteration, bsk: entry.bsk });
      const STOP = new Set(['to', 'a', 'an', 'the', 'of', 'in', 'at', 'on', 'be', 'is', 'are', 'or', 'and', 'with', 'from']);
      for (const word of phrase.split(/[,\s\/\-]+/).filter(w => w.length > 2 && !STOP.has(w))) {
        if (!_index.has(word)) _index.set(word, []);
        _index.get(word).push({ transliteration: entry.transliteration, bsk: entry.bsk, english: entry.english });
      }
    }

    // Urdu index — split on spaces and common punctuation
    if (entry.urdu) {
      const urduWords = entry.urdu.split(/[\s،,؛;]+/).filter(w => w.length > 1);
      for (const word of urduWords) {
        if (!_urduIndex.has(word)) _urduIndex.set(word, []);
        _urduIndex.get(word).push({ transliteration: entry.transliteration, bsk: entry.bsk, urdu: entry.urdu });
      }
    }
  }
}

/**
 * Returns verified Burushaski dictionary context to inject into a Gemini prompt.
 * sourceLang: 'en' (default) or 'ur' (Urdu) — selects which index to search.
 */
function getDictionaryContext(text, sourceLang = 'en') {
  buildIndex();

  if (sourceLang === 'ur') {
    // Search Urdu index — match individual Urdu words in the input
    const inputWords = text.trim().split(/[\s،,؛;]+/).filter(w => w.length > 1);
    const seen = new Set();
    const matches = [];
    for (const word of inputWords) {
      const hits = _urduIndex.get(word) || [];
      for (const hit of hits.slice(0, 3)) {
        if (!seen.has(hit.transliteration)) {
          seen.add(hit.transliteration);
          matches.push(hit);
        }
      }
      if (matches.length >= 6) break;
    }
    if (matches.length === 0) return '';
    const lines = matches.map(m => `"${m.urdu}" = "${m.transliteration}" (${m.bsk})`).join('\n');
    return `\nBurushaski Research Academy dictionary — Urdu→Burushaski matches:\n${lines}\nUse the exact transliterations above where relevant.\n`;
  }

  // English index
  const lower = text.toLowerCase().trim();
  const exact = _phraseIndex.get(lower);
  if (exact) {
    return `\nVERIFIED DICTIONARY ENTRY (Burushaski Research Academy):\n"${lower}" = "${exact.transliteration}"\n`;
  }

  const seen = new Set();
  const matches = [];
  for (const word of lower.split(/\W+/).filter(w => w.length > 2)) {
    for (const hit of (_index.get(word) || []).slice(0, 3)) {
      if (!seen.has(hit.transliteration)) {
        seen.add(hit.transliteration);
        matches.push(hit);
      }
    }
    if (matches.length >= 6) break;
  }
  if (matches.length === 0) return '';
  const lines = matches.map(m => `"${m.english}" = "${m.transliteration}"`).join('\n');
  return `\nBurushaski Research Academy dictionary entries (use these transliterations):\n${lines}\n`;
}

module.exports = { getDictionaryContext };
