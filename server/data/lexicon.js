// Lexicon data layer — Supabase-backed with in-memory read cache.
// Reads are synchronous (fast, from memory).
// Writes are async (durable, go to Supabase then update memory).
// Call initialize() once at server startup before accepting requests.
// DB updated 2026-07-04: 36 bsk_dictionary entries replaced with native Hussainabad words (Wiktionary/PDF).

const supabase = require('./supabase');

let _entries = {};   // { [entryId]: { ...row, translations: { [langCode]: row } } }
let _byText  = {};   // { [langCode]: { [lowerText]: entryId } }

// ── Startup ──────────────────────────────────────────────────────────────────

async function fetchAll(table, order) {
  const PAGE = 1000;
  let rows = [], from = 0;
  while (true) {
    let q = supabase.from(table).select('*').range(from, from + PAGE - 1);
    if (order) q = q.order(order.col, { ascending: order.asc, nullsFirst: false });
    const { data, error } = await q;
    if (error) throw new Error(`fetchAll ${table}: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function initialize() {
  const entries      = await fetchAll('lexicon_entries', { col: 'frequency_rank', asc: true });
  const translations = await fetchAll('translations');

  _entries = {};
  _byText  = {};

  for (const e of entries) {
    _entries[e.id] = { ...e, translations: {} };
    if (e.canonical_en) {
      _idx('en', e.canonical_en, e.id);
      // Also index without trailing punctuation so "how are you ?" matches "how are you?"
      const stripped = e.canonical_en.replace(/[?!.,;:]+$/, '').trim();
      if (stripped !== e.canonical_en) _idx('en', stripped, e.id);
    }
  }

  for (const t of translations) {
    if (!_entries[t.entry_id]) continue;
    _entries[t.entry_id].translations[t.lang_code] = t;
    _idx(t.lang_code, t.text, t.entry_id);
    // Extract Urdu gloss stored in notes during BSK dictionary import (format: "ur: نشان بنانا")
    if (t.notes && t.notes.startsWith('ur: ') && !_entries[t.entry_id].canonical_ur) {
      _entries[t.entry_id].canonical_ur = t.notes.slice(4).trim();
    }
  }

  console.log(`[lexicon] loaded ${Object.keys(_entries).length} entries, ${translations.length} translations`);
}

async function reload() {
  await initialize();
}

function _idx(langCode, text, entryId) {
  if (!_byText[langCode]) _byText[langCode] = {};
  _byText[langCode][text.toLowerCase().trim()] = entryId;
}

// ── Synchronous reads (in-memory) ────────────────────────────────────────────

function _slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function getContext(text, sourceLang, targetLang) {
  const clean = text.toLowerCase().trim();
  // Try exact lookup first
  let entryId = _byText[sourceLang]?.[clean];
  // Fallback: strip trailing punctuation ("where are you?" → "where are you")
  if (!entryId) {
    const stripped = clean.replace(/[?!.,;:]+$/, '').trim();
    entryId = _byText[sourceLang]?.[stripped];
  }
  // Fallback for English source: look up by slug directly in _entries
  if (!entryId && sourceLang === 'en') {
    entryId = _slug(clean);
    if (!_entries[entryId]) {
      entryId = _slug(clean.replace(/[?!.,;:]+$/, '').trim());
      if (!_entries[entryId]) entryId = null;
    }
  }
  if (entryId) {
    const t = _entries[entryId]?.translations[targetLang];
    // Only serve translations that have been explicitly verified
    if (t?.text && t.verified) {
      return { isExact: true, translation: t.text, roman: t.roman, confidence: t.confidence, source: t.source };
    }
  }

  // No exact match — gather verified word-level hits so the caller can build context for AI
  const { hits, coverage } = wordHits(text, sourceLang, targetLang);
  if (hits.length === 0) return null;

  const context =
    `\nVERIFIED ${targetLang.toUpperCase()} VOCABULARY (you MUST use these exact forms — do not change them):\n` +
    hits.map(h => `"${h.word}" = "${h.roman}"`).join('\n') + '\n';

  return { isExact: false, context, hits, coverage };
}

// Return candidate base forms for a token: handles English plurals, -ing, -ed.
// Ordered most-specific first so "berries"→"berry" is tried before "berries"→"berri".
function _deInflect(word) {
  const w = word;
  if (w.length < 3) return [w];
  const candidates = [w];
  if (w.endsWith('ies') && w.length > 4)  candidates.push(w.slice(0, -3) + 'y');   // berries→berry
  if (w.endsWith('ves') && w.length > 4)  candidates.push(w.slice(0, -3) + 'f');   // knives→knife
  if (w.endsWith('ses') && w.length > 3)  candidates.push(w.slice(0, -2));          // buses→bus
  if (w.endsWith('ches') && w.length > 4) candidates.push(w.slice(0, -2));          // watches→watch
  if (w.endsWith('shes') && w.length > 4) candidates.push(w.slice(0, -2));          // wishes→wish
  if (w.endsWith('ing') && w.length > 5)  candidates.push(w.slice(0, -3));          // running→runn (good enough for lexicon hit)
  if (w.endsWith('ing') && w.length > 6)  candidates.push(w.slice(0, -3) + 'e');   // taking→take
  if (w.endsWith('ed') && w.length > 4)   candidates.push(w.slice(0, -2));          // walked→walk
  if (w.endsWith('ed') && w.length > 4)   candidates.push(w.slice(0, -1));          // loved→love (drop d)
  if (w.endsWith('s') && w.length > 2)    candidates.push(w.slice(0, -1));          // yaks→yak, dogs→dog
  return candidates;
}

function _lookupWord(langCode, token, targetLang) {
  for (const form of _deInflect(token)) {
    const entryId = _byText[langCode]?.[form];
    const t = entryId && _entries[entryId]?.translations[targetLang];
    if (t?.text && t.verified) return { entryId, t, matchedForm: form };
  }
  return null;
}

function wordHits(phrase, sourceLang, targetLang) {
  const STOP = new Set(['the','a','an','is','are','was','were','be','been','i','you','he','she','it','we','they','and','or','but','in','on','at','to','of','for','do','does','did','have','has','can','could','will','would','please']);
  // Replace punctuation with space (not empty string) so "you?how" splits into ["you","how"]
  const clean = phrase.toLowerCase().replace(/[?!.,;:'"]+/g, ' ').replace(/\s+/g, ' ').trim();
  const tokens = clean.split(' ').filter(w => w.length > 0);
  const contentTokens = tokens.filter(w => !STOP.has(w));

  const hits = [];
  const coveredIdx = new Set(); // token indices already matched

  // Phase 1: longest-first N-gram scanning — catches sub-phrases like "how are you"
  // inside a longer input like "how are you doing today"
  for (let len = Math.min(tokens.length, 10); len >= 2; len--) {
    for (let start = 0; start <= tokens.length - len; start++) {
      const allCovered = Array.from({ length: len }, (_, i) => coveredIdx.has(start + i)).every(Boolean);
      if (allCovered) continue;
      const ngram = tokens.slice(start, start + len).join(' ');
      const entryId = _byText[sourceLang]?.[ngram];
      const t = entryId && _entries[entryId]?.translations[targetLang];
      if (t?.text && t.verified) {
        hits.push({ word: ngram, targetText: t.text, roman: t.roman || t.text, confidence: t.confidence });
        for (let i = start; i < start + len; i++) coveredIdx.add(i);
      }
    }
  }

  // Phase 2: single-word lookup with de-inflection (plurals, -ing, -ed)
  // Falls back to base forms so "yaks"→"yak", "running"→"run", etc. still hit the lexicon.
  const seenWords = new Set();
  for (let i = 0; i < tokens.length; i++) {
    if (coveredIdx.has(i)) continue;
    const word = tokens[i];
    if (seenWords.has(word)) continue;
    seenWords.add(word);
    const hit = _lookupWord(sourceLang, word, targetLang);
    if (hit) {
      const { t } = hit;
      hits.push({ word, targetText: t.text, roman: t.roman || t.text, confidence: t.confidence });
      coveredIdx.add(i);
    }
  }

  // Coverage = fraction of content tokens that got matched (by phrase or word)
  const coveredContent = tokens.reduce((n, tok, i) => n + (!STOP.has(tok) && coveredIdx.has(i) ? 1 : 0), 0);
  const coverage = contentTokens.length > 0 ? coveredContent / contentTokens.length : 0;
  return { hits, coverage };
}

function getEntry(entryId) {
  return _entries[entryId] || null;
}

function getStats(targetLang) {
  const all = Object.values(_entries);
  return {
    total:    all.length,
    verified: all.filter(e => e.translations[targetLang]?.verified).length,
    pending:  all.filter(e => !e.translations[targetLang]).length,
    words:    all.filter(e => e.type === 'word').length,
    phrases:  all.filter(e => e.type === 'phrase').length,
  };
}

function getPending(targetLang, category) {
  // category may be a comma-separated list of DB categories
  const cats = (category && category !== 'all')
    ? new Set(category.split(',').map(c => c.trim()).filter(Boolean))
    : null;
  return Object.values(_entries)
    .filter(e => {
      const t = e.translations[targetLang];
      return !t || !t.verified;
    })
    .filter(e => !cats || cats.has(e.category || ''))
    .sort((a, b) => (a.frequency_rank || 9999) - (b.frequency_rank || 9999));
}

function getCategoryStats(targetLang) {
  const cats = {};
  for (const e of Object.values(_entries)) {
    const c = e.category || 'uncategorised';
    if (!cats[c]) cats[c] = { total: 0, verified: 0, pending: 0 };
    cats[c].total++;
    if (e.translations[targetLang]?.verified) cats[c].verified++;
    else cats[c].pending++;
  }
  return cats;
}

// ── Async writes ──────────────────────────────────────────────────────────────

async function addEntry(id, canonical_en, type, category, frequency_rank) {
  if (_entries[id]) return false; // already in cache — nothing to do
  const row = { id, type, canonical_en, category: category || 'user_submitted', frequency_rank: frequency_rank || 8500 };
  const { error } = await supabase.from('lexicon_entries').upsert(row, { onConflict: 'id' });
  if (error) throw new Error('addEntry: ' + error.message);
  _entries[id] = { ...row, translations: {} };
  _idx('en', canonical_en, id);
  return true;
}

async function addTranslation(entryId, langCode, text, opts = {}) {
  const { roman, verified = false, confidence = 'community', source = 'community_consensus', notes } = opts;
  const row = {
    entry_id:   entryId,
    lang_code:  langCode,
    text:       text.trim(),
    roman:      roman?.trim() || text.trim(),
    verified,
    confidence,
    source,
    notes:      notes || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('translations')
    .upsert(row, { onConflict: 'entry_id,lang_code' });

  if (error) throw new Error('addTranslation: ' + error.message);

  if (_entries[entryId]) {
    _entries[entryId].translations[langCode] = row;
    _idx(langCode, text.trim(), entryId);
  }
}

async function recordContribution(entryId, langCode, text, opts = {}) {
  const { roman, notes, contributorTag = 'anonymous' } = opts;
  const { data, error } = await supabase
    .from('contributions')
    .insert({
      entry_id:        entryId,
      lang_code:       langCode,
      text:            text.trim(),
      roman:           roman?.trim() || null,
      notes:           notes || null,
      contributor_tag: contributorTag,
      status:          'pending',
    })
    .select()
    .single();

  if (error) throw new Error('recordContribution: ' + error.message);
  return data;
}

async function getContributionCount(entryId, langCode, normalizedText) {
  const { data } = await supabase
    .from('contributions')
    .select('text')
    .eq('entry_id', entryId)
    .eq('lang_code', langCode);

  return (data || []).filter(c => c.text.toLowerCase() === normalizedText).length;
}

async function promoteContributions(entryId, langCode, normalizedText) {
  const { data } = await supabase
    .from('contributions')
    .select('id, text')
    .eq('entry_id', entryId)
    .eq('lang_code', langCode);

  const ids = (data || [])
    .filter(c => c.text.toLowerCase() === normalizedText)
    .map(c => c.id);

  if (ids.length === 0) return;

  const { error } = await supabase
    .from('contributions')
    .update({ status: 'promoted' })
    .in('id', ids);

  if (error) throw new Error('promoteContributions: ' + error.message);
}

async function getTotalSubmissions(langCode) {
  const q = supabase.from('contributions').select('*', { count: 'exact', head: true });
  if (langCode) q.eq('lang_code', langCode);
  const { count } = await q;
  return count || 0;
}

module.exports = {
  initialize,
  reload,
  getContext,
  wordHits,
  getEntry,
  getStats,
  getPending,
  getCategoryStats,
  addEntry,
  addTranslation,
  recordContribution,
  getContributionCount,
  promoteContributions,
  getTotalSubmissions,
};
