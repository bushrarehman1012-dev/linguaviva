/**
 * Translates all lexicon_entries.canonical_en values to Urdu via Gemini
 * and upserts them into the translations table (lang_code = 'ur').
 *
 * Run once:  node server/scripts/import_urdu_translations.js
 *
 * Skips entries that already have a 'ur' translation in the DB.
 * Sends 50 words per Gemini call — ~145 calls total for 7k entries.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { GoogleGenerativeAI } = require('@google/generative-ai');
const supabase = require('../data/supabase');

const BATCH_SIZE  = 50;
const BATCH_DELAY = 2000; // ms between batches (Gemini free tier: 15 req/min)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAll(table, select) {
  const PAGE = 1000;
  let rows = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (error) throw new Error(`fetchAll ${table}: ${error.message}`);
    rows = rows.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

async function translateBatch(model, words) {
  const numbered = words.map((w, i) => `${i + 1}. ${w}`).join('\n');
  const prompt =
    `Translate the following English words/phrases to Urdu (Nastaliq script).\n` +
    `Return ONLY valid JSON: an array of strings in the same order, one Urdu translation per item.\n` +
    `Use natural Urdu — not transliteration. Example: ["آم","پانی","گھر"]\n\n` +
    `Words:\n${numbered}`;

  try {
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();
    // Extract JSON array from response
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch {}
    if (!parsed) {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) try { parsed = JSON.parse(m[0]); } catch {}
    }
    if (!Array.isArray(parsed) || parsed.length !== words.length) {
      console.warn('  Unexpected response length or format — skipping batch');
      return null;
    }
    return parsed;
  } catch (e) {
    console.warn('  Gemini call failed:', e.message);
    return null;
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model  = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  console.log('Fetching lexicon entries...');
  const entries = await fetchAll('lexicon_entries', 'id,canonical_en');
  console.log(`  ${entries.length} entries loaded`);

  console.log('Fetching existing ur translations...');
  const { data: urRows, error: urErr } = await supabase
    .from('translations')
    .select('entry_id')
    .eq('lang_code', 'ur');
  if (urErr) throw new Error('fetch ur translations: ' + urErr.message);

  const hasUrdu = new Set((urRows || []).map(r => r.entry_id));
  console.log(`  ${hasUrdu.size} entries already have Urdu translations — will skip them`);

  const todo = entries.filter(e => e.canonical_en && !hasUrdu.has(e.id));
  console.log(`  ${todo.length} entries need Urdu translations`);
  console.log(`  ${Math.ceil(todo.length / BATCH_SIZE)} Gemini calls needed\n`);

  let inserted = 0, failed = 0;
  const totalBatches = Math.ceil(todo.length / BATCH_SIZE);

  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`Batch ${batchNum}/${totalBatches}  (${i + 1}–${Math.min(i + BATCH_SIZE, todo.length)} of ${todo.length})... `);

    const words    = batch.map(e => e.canonical_en);
    const results  = await translateBatch(model, words);

    if (!results) {
      console.log('skipped (bad response)');
      failed += batch.length;
      await sleep(BATCH_DELAY);
      continue;
    }

    const rows = [];
    for (let j = 0; j < batch.length; j++) {
      const urdu = (results[j] || '').trim();
      if (!urdu) { failed++; continue; }
      rows.push({
        entry_id:   batch[j].id,
        lang_code:  'ur',
        text:       urdu,
        roman:      null,
        verified:   false,
        confidence: 'auto',
        source:     'gemini_translate',
        notes:      null,
        updated_at: new Date().toISOString(),
      });
    }

    if (rows.length > 0) {
      const { error } = await supabase
        .from('translations')
        .upsert(rows, { onConflict: 'entry_id,lang_code', ignoreDuplicates: true });
      if (error) {
        console.error('\n  Supabase upsert error:', error.message);
        failed += rows.length;
      } else {
        inserted += rows.length;
        console.log(`done (${rows.length} saved — total: ${inserted})`);
      }
    } else {
      console.log('done (0 saved)');
    }

    if (i + BATCH_SIZE < todo.length) await sleep(BATCH_DELAY);
  }

  console.log(`\nDone.`);
  console.log(`  Inserted : ${inserted}`);
  console.log(`  Skipped  : ${hasUrdu.size} (already existed)`);
  console.log(`  Failed   : ${failed}`);
}

main().catch(e => { console.error(e); process.exit(1); });
