// One-time migration: JSON files → Supabase
// Run ONCE after creating the schema:
//   node scripts/migrate_to_supabase.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const LEX_FILE   = path.join(__dirname, '../data/lexicon.json');
const CORR_FILE  = path.join(__dirname, '../data/corrections.json');
const CONTRIB_FILE = path.join(__dirname, '../data/contributions.json');

async function upsertBatch(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error } = await sb.from(table).upsert(batch, { onConflict: conflict });
    if (error) throw new Error(`${table} batch ${i}: ${error.message}`);
    process.stdout.write(`  ${table}: ${Math.min(i + 100, rows.length)}/${rows.length}\r`);
  }
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

async function run() {
  console.log('\n🚀 Migrating Bašh data to Supabase\n');

  // ── 1. Lexicon entries ─────────────────────────────────────
  const lex = JSON.parse(fs.readFileSync(LEX_FILE, 'utf8'));
  console.log(`Lexicon: ${lex.entries.length} entries`);

  const entryRows = lex.entries.map(e => ({
    id:             e.id,
    type:           e.type || 'word',
    pos:            e.pos || null,
    category:       e.category || null,
    canonical_en:   e.canonical_en,
    frequency_rank: e.frequency_rank || null,
  }));
  await upsertBatch('lexicon_entries', entryRows, 'id');

  // ── 2. Translations ────────────────────────────────────────
  const translationRows = [];
  for (const e of lex.entries) {
    for (const [langCode, t] of Object.entries(e.translations || {})) {
      if (!t?.text) continue;
      translationRows.push({
        entry_id:   e.id,
        lang_code:  langCode,
        text:       t.text,
        roman:      t.roman || null,
        verified:   t.verified || false,
        confidence: t.confidence || 'medium',
        source:     t.source || 'baseline',
        notes:      t.notes || null,
      });
    }
  }
  console.log(`Translations: ${translationRows.length}`);
  await upsertBatch('translations', translationRows, 'entry_id,lang_code');

  // ── 3. Pending contributions stored inside lexicon entries ─
  const pendingRows = [];
  for (const e of lex.entries) {
    for (const c of (e.pending_contributions || [])) {
      if (!c?.text) continue;
      pendingRows.push({
        entry_id:        e.id,
        lang_code:       'bsk',
        text:            c.text,
        roman:           c.roman || null,
        contributor_tag: 'migrated',
        status:          'pending',
        created_at:      c.timestamp || new Date().toISOString(),
      });
    }
  }
  if (pendingRows.length) {
    console.log(`Pending contributions (from lexicon): ${pendingRows.length}`);
    await upsertBatch('contributions', pendingRows, 'id');
  }

  // ── 4. contributions.json ──────────────────────────────────
  if (fs.existsSync(CONTRIB_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CONTRIB_FILE, 'utf8'));
    const rows = (raw.entries || []).filter(c => c.entryId && c.text).map(c => ({
      entry_id:        c.entryId,
      lang_code:       c.targetLang || 'bsk',
      text:            c.text,
      roman:           c.roman || null,
      notes:           c.notes || null,
      contributor_tag: c.contributorTag || 'anonymous',
      status:          c.status || 'pending',
      created_at:      c.timestamp || new Date().toISOString(),
    }));
    if (rows.length) {
      console.log(`Contributions file: ${rows.length}`);
      // Use insert (not upsert) — these are new unique submissions
      for (let i = 0; i < rows.length; i += 100) {
        const { error } = await sb.from('contributions').insert(rows.slice(i, i + 100));
        if (error) console.warn(`  contributions batch warning: ${error.message}`);
      }
      console.log(`  ✓ contributions: ${rows.length} rows`);
    }
  }

  // ── 5. corrections.json ────────────────────────────────────
  if (fs.existsSync(CORR_FILE)) {
    const raw = JSON.parse(fs.readFileSync(CORR_FILE, 'utf8'));
    const rows = [];
    for (const [key, value] of Object.entries(raw)) {
      const parts = key.split('|');
      if (parts.length < 3) continue;
      const [sourceLang, targetLang, ...rest] = parts;
      rows.push({
        source_lang:           sourceLang,
        target_lang:           targetLang,
        original_text:         rest.join('|'),
        corrected_translation: value.translation || value,
      });
    }
    if (rows.length) {
      console.log(`Corrections: ${rows.length}`);
      await upsertBatch('corrections', rows, 'source_lang,target_lang,original_text');
    }
  }

  // ── Summary ────────────────────────────────────────────────
  const [{ count: e }, { count: t }, { count: c }, { count: cr }] = await Promise.all([
    sb.from('lexicon_entries').select('*', { count: 'exact', head: true }),
    sb.from('translations').select('*', { count: 'exact', head: true }),
    sb.from('contributions').select('*', { count: 'exact', head: true }),
    sb.from('corrections').select('*', { count: 'exact', head: true }),
  ]);

  console.log('\n✅ Migration complete\n');
  console.log(`  lexicon_entries : ${e}`);
  console.log(`  translations    : ${t}`);
  console.log(`  contributions   : ${c}`);
  console.log(`  corrections     : ${cr}`);
  console.log('\nYou can now start the server: node index.js');
}

run().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
