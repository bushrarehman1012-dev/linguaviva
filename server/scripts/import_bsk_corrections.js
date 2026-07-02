// Imports verified Burushaski translations from bsk_verification_list.csv into Supabase.
// Rows with a correct_form use that; rows marked in_research_academy_dict=YES or verified=Yes
// use current_bsk. All imported as verified=true, source='research_verified'.
//
// Run: node server/scripts/import_bsk_corrections.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs       = require('fs');
const path     = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

function slug(en) {
  return en.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function parseCSV(raw) {
  const rows = [];
  for (const line of raw.split('\n').slice(1)) {
    if (!line.trim()) continue;
    // Handle quoted fields
    const cols = [];
    let cur = '', inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    cols.push(cur.trim());
    rows.push({
      english:             (cols[0] || '').trim(),
      current_bsk:         (cols[1] || '').trim(),
      community_corrected: (cols[2] || '').trim(),
      in_academy_dict:     (cols[3] || '').toUpperCase() === 'YES',
      verified:            (cols[4] || '').toLowerCase() === 'yes',
      correct_form:        (cols[5] || '').trim(),
      notes:               (cols[6] || '').trim(),
    });
  }
  return rows;
}

async function main() {
  const raw  = fs.readFileSync(path.join(__dirname, '../data/bsk_verification_list.csv'), 'utf8');
  const rows = parseCSV(raw);

  console.log(`Parsed ${rows.length} rows from CSV`);

  // Fetch all existing entry IDs from Supabase so we only update what exists
  const { data: existing, error: fetchErr } = await supabase
    .from('lexicon_entries')
    .select('id');
  if (fetchErr) { console.error('Failed to fetch entries:', fetchErr.message); process.exit(1); }
  const existingIds = new Set(existing.map(e => e.id));

  const toUpsert  = [];
  const toInsert  = []; // entries not yet in lexicon
  const skipped   = [];

  for (const row of rows) {
    if (!row.english) continue;

    // Determine the best available Burushaski text
    const bskText = row.correct_form || (row.in_academy_dict || row.verified ? row.current_bsk : null);
    if (!bskText) { skipped.push(row.english + ' (no verified form)'); continue; }

    const entryId = slug(row.english);

    if (!existingIds.has(entryId)) {
      // Add the missing entry then its translation
      toInsert.push({
        id:           entryId,
        type:         row.english.includes(' ') ? 'phrase' : 'word',
        canonical_en: row.english.toLowerCase(),
        category:     'travel',
        pos:          null,
      });
    }

    toUpsert.push({
      entry_id:   entryId,
      lang_code:  'bsk',
      text:       bskText,
      roman:      bskText,        // already romanized
      verified:   true,
      confidence: 'high',
      source:     row.in_academy_dict ? 'academy_dict' : 'research_verified',
      notes:      row.notes || null,
      updated_at: new Date().toISOString(),
    });
  }

  // Deduplicate by id (same English phrase appearing twice → keep first occurrence)
  const seenEntries = new Set();
  const insertUniq  = toInsert.filter(e => { if (seenEntries.has(e.id)) return false; seenEntries.add(e.id); return true; });
  const seenTrans   = new Set();
  const upsertUniq  = toUpsert.filter(t => {
    const k = `${t.entry_id}|${t.lang_code}`;
    if (seenTrans.has(k)) return false; seenTrans.add(k); return true;
  });

  console.log(`New entries to create: ${insertUniq.length}`);
  console.log(`Translations to upsert: ${upsertUniq.length}`);
  console.log(`Skipped (no verified form): ${skipped.length}`);

  // Insert missing lexicon entries first
  if (insertUniq.length > 0) {
    const { error } = await supabase.from('lexicon_entries').upsert(insertUniq, { onConflict: 'id' });
    if (error) { console.error('Entry insert error:', error.message); process.exit(1); }
    console.log(`Created ${insertUniq.length} new lexicon entries`);
  }

  // Upsert translations (overwrite wrong baseline translations)
  for (let i = 0; i < upsertUniq.length; i += 50) {
    const batch = upsertUniq.slice(i, i + 50);
    const { error } = await supabase
      .from('translations')
      .upsert(batch, { onConflict: 'entry_id,lang_code' });
    if (error) { console.error(`Batch ${i} error:`, error.message); process.exit(1); }
  }

  console.log(`\nDone. Upserted ${upsertUniq.length} verified Burushaski translations.`);
  console.log('Entries like "where are you" now have research-verified forms.');
  if (skipped.length) console.log('Skipped:', skipped.slice(0, 10).join(', '));
}

main().catch(console.error);
