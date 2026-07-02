// Corrections data layer — Supabase-backed with in-memory read cache.
// Reads are synchronous. Writes are async.

const supabase = require('./supabase');

// key: "sourceLang|targetLang|text_lowercase"  →  corrected translation string
let _cache = new Map();

// ── Startup ───────────────────────────────────────────────────────────────────

async function initialize() {
  const { data, error } = await supabase.from('corrections').select('*');
  if (error) throw new Error('corrections init: ' + error.message);

  _cache.clear();
  for (const row of data) {
    _cache.set(_key(row.source_lang, row.target_lang, row.original_text), row.corrected_translation);
  }
  console.log(`[corrections] loaded ${_cache.size} entries`);
}

function _key(sourceLang, targetLang, text) {
  return `${sourceLang}|${targetLang}|${text.trim().toLowerCase()}`;
}

// ── Synchronous reads ─────────────────────────────────────────────────────────

function get(sourceLang, targetLang, text) {
  return _cache.get(_key(sourceLang, targetLang, text)) || null;
}

// cacheKey arrives as "sourceLang|targetLang|text" (already from translate.js)
function getByKey(cacheKey) {
  const parts = cacheKey.split('|');
  if (parts.length < 3) return null;
  const [src, tgt, ...rest] = parts;
  const correction = _cache.get(`${src}|${tgt}|${rest.join('|').toLowerCase()}`);
  return correction ? { translation: correction, source: 'correction' } : null;
}

function getWordHits(sourceLang, targetLang, phrase) {
  const STOP = new Set(['the','a','an','is','are','was','i','you','he','she','it','we','they','and','or','but','in','on','at','to','of']);
  const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const hits  = [];
  for (const word of words) {
    const correction = _cache.get(_key(sourceLang, targetLang, word));
    if (correction) hits.push({ word, translation: correction });
  }
  return hits;
}

// ── Async writes ──────────────────────────────────────────────────────────────

async function add(sourceLang, targetLang, text, correctedTranslation) {
  const originalText = text.trim().toLowerCase();
  const { error } = await supabase
    .from('corrections')
    .upsert(
      { source_lang: sourceLang, target_lang: targetLang, original_text: originalText, corrected_translation: correctedTranslation.trim() },
      { onConflict: 'source_lang,target_lang,original_text' }
    );
  if (error) throw new Error('corrections.add: ' + error.message);
  _cache.set(_key(sourceLang, targetLang, text), correctedTranslation.trim());
}

async function remove(sourceLang, targetLang, text) {
  const originalText = text.trim().toLowerCase();
  const { error } = await supabase
    .from('corrections')
    .delete()
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang)
    .eq('original_text', originalText);
  if (error) throw new Error('corrections.remove: ' + error.message);
  _cache.delete(_key(sourceLang, targetLang, text));
}

module.exports = { initialize, get, getByKey, getWordHits, add, remove };
