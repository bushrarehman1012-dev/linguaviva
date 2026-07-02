// Central lexicon — single source of truth for all verified translations.
// Replaces wordlists.js + masterLookup.js.
// Priority: community_native > dictionary > baseline > ai_unverified

const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'lexicon.json');
let _data  = null;
// Inverted indexes: lang → Map(lowercased text → entry)
const _idx = {};

function load() {
  if (_data) return;
  try {
    _data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    _data = { entries: [] };
  }
  _buildIndexes();
}

function _buildIndexes() {
  _idx.clear && _idx.clear();
  for (const key of Object.keys(_idx)) delete _idx[key];

  for (const entry of _data.entries) {
    for (const [lang, t] of Object.entries(entry.translations || {})) {
      if (!_idx[lang]) _idx[lang] = new Map();
      const text = (t.text || '').toLowerCase().trim();
      const roman = (t.roman || '').toLowerCase().trim();
      if (text)  _idx[lang].set(text,  entry);
      if (roman && roman !== text) _idx[lang].set(roman, entry);
      // Also index by canonical_en for any language so EN lookups are fast
      if (entry.canonical_en) _idx[lang].set(entry.canonical_en.toLowerCase(), entry);
    }
  }
}

/** Reload from disk (call after external writes) */
function reload() {
  _data = null;
  _idx  && Object.keys(_idx).forEach(k => delete _idx[k]);
  load();
}

/**
 * Exact lookup: given input text in sourceLang, return translation in targetLang.
 * Returns { text, roman, confidence, verified, source, notes } or null.
 */
function lookup(text, sourceLang, targetLang) {
  load();
  const key = text.toLowerCase().trim();
  const srcIdx = _idx[sourceLang];
  if (!srcIdx) return null;
  const entry = srcIdx.get(key);
  if (!entry) return null;
  const t = entry.translations[targetLang];
  if (!t) return null;
  return { ...t, pos: entry.type, category: entry.category };
}

/**
 * Word-level hits: find all words in a phrase that have lexicon entries.
 * Returns array of { word, targetText, roman, confidence }.
 */
function wordHits(phrase, sourceLang, targetLang) {
  load();
  const tokens = phrase.toLowerCase()
    .replace(/[?!.,;:'"؟]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1);

  const hits = [];
  for (const token of tokens) {
    const srcIdx = _idx[sourceLang];
    if (!srcIdx) continue;
    const entry = srcIdx.get(token);
    if (!entry) continue;
    const t = entry.translations[targetLang];
    if (t) hits.push({ word: token, targetText: t.text, roman: t.roman, confidence: t.confidence });
  }
  return hits;
}

/**
 * Build a context string for Gemini injection.
 * Returns { isExact, translation, roman } on exact match,
 * or { isExact: false, context: string } for partial word matches,
 * or null if nothing found.
 */
function getContext(text, sourceLang, targetLang) {
  load();
  const exact = lookup(text, sourceLang, targetLang);
  if (exact) {
    return { isExact: true, translation: exact.text, roman: exact.roman || exact.text, confidence: exact.confidence };
  }

  const hits = wordHits(text, sourceLang, targetLang);
  if (hits.length === 0) return null;

  const lines = hits
    .map(h => `"${h.word}" = "${h.targetText}"${h.roman && h.roman !== h.targetText ? ` (${h.roman})` : ''}`)
    .join('\n');

  return {
    isExact: false,
    context: `\nVERIFIED LEXICON VOCABULARY (use these exact forms):\n${lines}\n`,
  };
}

/**
 * Add or update a single entry.
 * options: { type, pos, category, confidence, source, notes, verified }
 */
function addTranslation(canonicalEn, targetLang, translationText, options = {}) {
  load();
  const id = canonicalEn.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  let entry = _data.entries.find(e => e.id === id || e.canonical_en === canonicalEn.toLowerCase());

  if (!entry) {
    entry = {
      id,
      type:         options.type     || (canonicalEn.includes(' ') ? 'phrase' : 'word'),
      pos:          options.pos      || null,
      category:     options.category || null,
      canonical_en: canonicalEn.toLowerCase(),
      translations: {
        en: { text: canonicalEn, verified: true, source: 'baseline' },
      },
      updated_at: '',
    };
    _data.entries.push(entry);
  }

  entry.translations[targetLang] = {
    text:       translationText,
    roman:      options.roman || translationText,
    verified:   options.verified  !== undefined ? options.verified : true,
    confidence: options.confidence || 'high',
    source:     options.source     || 'community_native',
    ...(options.notes ? { notes: options.notes } : {}),
  };
  entry.updated_at = new Date().toISOString().slice(0, 10);

  // Rebuild index for affected language
  if (!_idx[targetLang]) _idx[targetLang] = new Map();
  const text = translationText.toLowerCase().trim();
  _idx[targetLang].set(text, entry);
  _idx[targetLang].set(canonicalEn.toLowerCase(), entry);

  save();
}

function save() {
  if (!_data) return;
  _data.updated_at    = new Date().toISOString().slice(0, 10);
  _data.total_entries = _data.entries.length;
  _data.verified_bsk  = _data.entries.filter(e => e.translations?.bsk?.verified).length;
  fs.writeFileSync(FILE, JSON.stringify(_data, null, 2), 'utf8');
}

function stats() {
  load();
  return {
    total:        _data.entries.length,
    words:        _data.entries.filter(e => e.type === 'word').length,
    phrases:      _data.entries.filter(e => e.type === 'phrase').length,
    verified_bsk: _data.entries.filter(e => e.translations?.bsk?.verified).length,
    updated_at:   _data.updated_at,
  };
}

module.exports = { lookup, wordHits, getContext, addTranslation, reload, stats };
