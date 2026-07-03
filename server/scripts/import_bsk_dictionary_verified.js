/**
 * Import bsk_dictionary.json as verified BSK translations.
 * Each entry has: bsk (Nastaliq), transliteration (Latin), urdu, english.
 * Run: node server/scripts/import_bsk_dictionary_verified.js
 */

require('dotenv').config();
const supabase = require('../data/supabase');
const data     = require('../data/bsk_dictionary.json');

function slug(s) {
  return s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100);
}

async function run() {
  const entries = data.entries;
  console.log(`[import] ${entries.length} entries in bsk_dictionary.json`);

  let lexOk = 0, trOk = 0, errors = 0;
  const BATCH = 100;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);

    // Deduplicate by slug within the batch (Postgres can't update the same row twice in one statement)
    const seenIds = new Set();
    const deduped = batch.filter(e => {
      const id = slug(e.english);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    // Upsert English lexicon entries (skip if id already exists — don't overwrite higher-frequency seeds)
    const lexRows = deduped.map((e, j) => ({
      id:           slug(e.english),
      canonical_en: e.english.trim().toLowerCase(),
      type:         e.english.trim().includes(' ') ? 'phrase' : 'word',
      category:     'vocabulary',
      frequency_rank: 6000 + i + j,
    }));

    const { error: le } = await supabase
      .from('lexicon_entries')
      .upsert(lexRows, { onConflict: 'id', ignoreDuplicates: true });

    if (le) { console.error('Lexicon batch error:', le.message); errors++; continue; }
    lexOk += deduped.length;

    // Upsert BSK translations as verified=true (update if already exists)
    const trRows = deduped.map(e => ({
      entry_id:   slug(e.english),
      lang_code:  'bsk',
      text:       e.bsk.trim(),
      roman:      e.transliteration.trim(),
      verified:   true,
      confidence: 'high',
      source:     'bsk_dictionary',
      notes:      `ur: ${e.urdu}`,
      updated_at: new Date().toISOString(),
    }));

    const { error: te } = await supabase
      .from('translations')
      .upsert(trRows, { onConflict: 'entry_id,lang_code' });

    if (te) { console.error('Translation batch error:', te.message); errors++; }
    else trOk += deduped.length;

    process.stdout.write(`\r[import] ${Math.min(i + BATCH, entries.length)}/${entries.length} processed…`);
  }

  console.log(`\n[import] done — ${lexOk} lexicon rows, ${trOk} BSK translations verified, ${errors} batch errors`);

  // Print final verified count
  const { count } = await supabase
    .from('translations')
    .select('*', { count: 'exact', head: true })
    .eq('lang_code', 'bsk')
    .eq('verified', true);
  console.log(`[import] total verified BSK translations in DB: ${count}`);
}

run().catch(err => { console.error(err); process.exit(1); });
