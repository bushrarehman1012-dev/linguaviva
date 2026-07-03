// Lexicon data layer — Supabase-backed with in-memory read cache.
// Reads are synchronous (fast, from memory).
// Writes are async (durable, go to Supabase then update memory).
// Call initialize() once at server startup before accepting requests.

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
    // Index English canonical text so getContext('where are you?', 'en', 'bsk') resolves
    if (e.canonical_en) _idx('en', e.canonical_en, e.id);
  }

  for (const t of translations) {
    if (!_entries[t.entry_id]) continue;
    _entries[t.entry_id].translations[t.lang_code] = t;
    _idx(t.lang_code, t.text, t.entry_id);
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
  if (!entryId) return null;
  const t = _entries[entryId]?.translations[targetLang];
  if (!t?.text) return null;
  return { isExact: true, translation: t.text, roman: t.roman, confidence: t.confidence, source: t.source };
}

function wordHits(phrase, sourceLang, targetLang) {
  const STOP = new Set(['the','a','an','is','are','was','were','be','been','i','you','he','she','it','we','they','and','or','but','in','on','at','to','of','for']);
  const words = phrase.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
  const hits  = [];
  for (const word of words) {
    const entryId = _byText[sourceLang]?.[word];
    const t = entryId && _entries[entryId]?.translations[targetLang];
    if (t?.text) hits.push({ word, targetText: t.text, roman: t.roman, confidence: t.confidence });
  }
  return hits;
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
  addTranslation,
  recordContribution,
  getContributionCount,
  promoteContributions,
  getTotalSubmissions,
};
