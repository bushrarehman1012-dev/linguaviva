/**
 * Import burushaski_translation_expanded_hussainabad.csv
 * ~958 rows, 806 unique BSK entries (Hussainabad dialect)
 * Sources: Wiktionary, PDF picture dictionary, Wikitravel phrasebook
 *
 * Run: node server/scripts/import_hussainabad_vocabulary.js
 */

require('dotenv').config();
const fs      = require('fs');
const path    = require('path');
const supabase = require('../data/supabase');

const CSV_PATH = path.join(__dirname, '../data/burushaski_translation_expanded_hussainabad.csv');

// Minimal RFC 4180 CSV parser (handles quoted fields with embedded commas/newlines)
function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; }
        else { inQ = false; i++; }
      } else { field += c; i++; }
    } else {
      if      (c === '"')              { inQ = true; i++; }
      else if (c === ',')              { row.push(field.trim()); field = ''; i++; }
      else if (c === '\n' || c === '\r') {
        row.push(field.trim()); field = '';
        if (row.some(f => f)) rows.push(row);
        row = [];
        if (c === '\r' && text[i + 1] === '\n') i++;
        i++;
      } else { field += c; i++; }
    }
  }
  if (field || row.length) { row.push(field.trim()); if (row.some(f => f)) rows.push(row); }
  return rows;
}

function slug(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100);
}

// Normalise category names to the app's existing vocabulary
const CATEGORY_MAP = {
  general: 'general', body: 'body', food: 'food', eating: 'food',
  animals: 'animals', birds: 'animals', numbers: 'numbers',
  health: 'health', objects: 'objects', tools: 'objects',
  family: 'family', nature: 'nature', household: 'household',
  transport: 'transport', driving: 'transport', 'bus and train': 'transport', taxi: 'transport',
  directions: 'directions', phrase: 'phrases', problems: 'phrases',
  basics: 'phrases', 'greetings/basic': 'phrases', greetings: 'phrases',
  days: 'time', months: 'time', time: 'time', 'clock time': 'time', duration: 'time',
  zodiac: 'cultural', astronomy: 'cultural', music: 'cultural',
  colors: 'colors', clothing: 'clothing',
  lodging: 'travel', shopping: 'travel', travel: 'travel', bars: 'food',
  places: 'places', people: 'general', authority: 'general',
  'pronoun/question': 'vocabulary', noun: 'vocabulary',
};

function normaliseCategory(raw) {
  const c = (raw || '').replace(/['"]/g, '').split('/')[0].trim().toLowerCase();
  return CATEGORY_MAP[c] || 'vocabulary';
}

// Map raw CSV source string to a clean internal source tag + confidence level
function mapSource(raw) {
  if (raw.includes('Wiktionary'))  return { source: 'hussainabad_wiktionary',  confidence: 'medium' };
  if (raw.includes('34412141') || raw.includes('Buruso') || raw.includes('pdf'))
                                   return { source: 'hussainabad_pdf_dict',    confidence: 'medium' };
  // Wikitravel or any fallback — phrasebook quality, heuristic Nastaliq
  return                                  { source: 'hussainabad_wikitravel',  confidence: 'low' };
}

// Priority for dedup when the same English slug appears in multiple sources
const SOURCE_PRIORITY = {
  hussainabad_wiktionary: 1,
  hussainabad_pdf_dict:   2,
  hussainabad_wikitravel: 3,
};

// Take the first variant when a field lists several separated by / or ,
function firstVariant(s) {
  return (s || '').split(/[/,]/)[0].trim();
}

async function run() {
  const content = fs.readFileSync(CSV_PATH, 'utf8');
  const rawRows = parseCSV(content);

  const headers = rawRows[0].map(h => h.replace(/\r/g, ''));
  const data = rawRows.slice(1).map(cols => {
    const r = {};
    headers.forEach((h, i) => r[h] = (cols[i] || '').replace(/\r/g, '').trim());
    return r;
  });

  console.log(`[import] ${data.length} total rows from CSV`);

  // ── 1. Filter ──────────────────────────────────────────────────────────────
  const valid = data.filter(r =>
    r.english.trim() &&
    (r.bsk_nastaliq.trim() || r.transliteration.trim())
  );
  console.log(`[import] ${valid.length} valid rows (non-empty english + at least one BSK field)`);

  // ── 2. Deduplicate: for the same slug keep the highest-priority source ─────
  const bestBySlug = new Map(); // slug → enriched row
  for (const r of valid) {
    const s = slug(r.english);
    const { source, confidence } = mapSource(r.source);
    const priority = SOURCE_PRIORITY[source] || 3;

    if (!bestBySlug.has(s) || priority < bestBySlug.get(s)._priority) {
      bestBySlug.set(s, { ...r, _slug: s, _source: source, _confidence: confidence, _priority: priority });
    }
  }
  const entries = Array.from(bestBySlug.values());
  console.log(`[import] ${entries.length} unique entries after deduplication`);

  // ── 3. Normalise fields ────────────────────────────────────────────────────
  for (const r of entries) {
    r._bsk      = firstVariant(r.bsk_nastaliq) || firstVariant(r.transliteration);
    r._roman    = firstVariant(r.transliteration);
    r._category = normaliseCategory(r.category);
    r._english  = r.english.replace(/^"(.+)"$/, '$1').trim();
  }

  // ── 4. Pre-import count ────────────────────────────────────────────────────
  const { count: beforeCount } = await supabase
    .from('translations')
    .select('*', { count: 'exact', head: true })
    .eq('lang_code', 'bsk')
    .eq('verified', true);
  console.log(`[import] BSK verified translations before import: ${beforeCount}`);

  // ── 5. Batch upsert ────────────────────────────────────────────────────────
  const BATCH = 100;
  let lexOk = 0, trOk = 0, errors = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);

    // Safety dedup within batch (slug already unique across all entries, but guard anyway)
    const batchSeen = new Set();
    const clean = batch.filter(r => {
      if (batchSeen.has(r._slug)) return false;
      batchSeen.add(r._slug);
      return true;
    });

    // Lexicon entries — skip if slug already exists (don't overwrite frequency-ranked seeds)
    const lexRows = clean.map((r, j) => ({
      id:             r._slug,
      canonical_en:   r._english.toLowerCase(),
      type:           r._english.includes(' ') ? 'phrase' : 'word',
      category:       r._category,
      frequency_rank: 7000 + i + j,
    }));

    const { error: le } = await supabase
      .from('lexicon_entries')
      .upsert(lexRows, { onConflict: 'id', ignoreDuplicates: true });

    if (le) { console.error('\nLexicon batch error:', le.message); errors++; continue; }
    lexOk += clean.length;

    // BSK translations — skip if already exists (preserves higher-quality existing data)
    const trRows = clean.map(r => {
      const noteParts = [
        r.urdu        ? `ur: ${r.urdu}`             : null,
        r.pos         ? `pos: ${r.pos}`              : null,
        r.notes       ? r.notes.trim()               : null,
      ].filter(Boolean);

      return {
        entry_id:   r._slug,
        lang_code:  'bsk',
        text:       r._bsk,
        roman:      r._roman,
        verified:   true,
        confidence: r._confidence,
        source:     r._source,
        notes:      noteParts.join('; '),
        updated_at: new Date().toISOString(),
      };
    });

    const { error: te } = await supabase
      .from('translations')
      .upsert(trRows, { onConflict: 'entry_id,lang_code', ignoreDuplicates: true });

    if (te) { console.error('\nTranslation batch error:', te.message); errors++; }
    else trOk += clean.length;

    process.stdout.write(`\r[import] ${Math.min(i + BATCH, entries.length)}/${entries.length} processed…`);
  }

  // ── 6. Summary ─────────────────────────────────────────────────────────────
  const { count: afterCount } = await supabase
    .from('translations')
    .select('*', { count: 'exact', head: true })
    .eq('lang_code', 'bsk')
    .eq('verified', true);

  console.log(`\n[import] done`);
  console.log(`  lexicon rows attempted : ${lexOk}`);
  console.log(`  translation rows       : ${trOk}`);
  console.log(`  batch errors           : ${errors}`);
  console.log(`  BSK verified before    : ${beforeCount}`);
  console.log(`  BSK verified after     : ${afterCount}`);
  console.log(`  net new translations   : ${afterCount - beforeCount}`);
}

run().catch(err => { console.error(err); process.exit(1); });
