// Persistent store for user-submitted translation corrections.
// Keys are always lowercased so "Where" and "where" resolve to the same correction.

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'corrections.json');
let _store = null;

function normalizeKey(sourceLang, targetLang, text) {
  return `${sourceLang}|${targetLang}|${text.trim().toLowerCase()}`;
}

function load() {
  if (_store) return;
  try {
    if (fs.existsSync(FILE)) {
      const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
      // Migrate: lowercase all existing keys so old mixed-case entries still work
      _store = new Map();
      for (const [k, v] of Object.entries(raw)) {
        _store.set(k.toLowerCase(), v);
      }
    } else {
      _store = new Map();
    }
  } catch {
    _store = new Map();
  }
}

function save() {
  fs.writeFileSync(FILE, JSON.stringify(Object.fromEntries(_store), null, 2), 'utf8');
}

/** Returns correction object or null */
function get(sourceLang, targetLang, text) {
  load();
  return _store.get(normalizeKey(sourceLang, targetLang, text)) || null;
}

/** Looks up by a pre-built cache key (splits on first two | separators) */
function getByKey(cacheKey) {
  const parts = cacheKey.split('|');
  if (parts.length < 3) return null;
  const sourceLang = parts[0];
  const targetLang = parts[1];
  const text = parts.slice(2).join('|');
  return get(sourceLang, targetLang, text);
}

/** Saves a correction and persists to disk */
function add(sourceLang, targetLang, text, correctedTranslation) {
  load();
  const key = normalizeKey(sourceLang, targetLang, text);
  _store.set(key, {
    translation: correctedTranslation.trim(),
    transliteration: correctedTranslation.trim(),
    source: 'correction',
  });
  save();
}

/** Removes a correction */
function remove(sourceLang, targetLang, text) {
  load();
  _store.delete(normalizeKey(sourceLang, targetLang, text));
  save();
}

/** Returns all corrections whose source word appears as a token in the given phrase */
function getWordHits(sourceLang, targetLang, phrase) {
  load();
  const tokens = phrase.toLowerCase().replace(/[?!.,;:'"؟]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const hits = [];
  for (const token of tokens) {
    const key = normalizeKey(sourceLang, targetLang, token);
    const c = _store.get(key);
    if (c) hits.push({ word: token, translation: c.translation });
  }
  return hits;
}

function size() {
  load();
  return _store.size;
}

module.exports = { get, getByKey, add, remove, getWordHits, size };
