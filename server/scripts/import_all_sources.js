// Comprehensive data import from all available sources:
//   1. everyday_travel_spoken_english_curated_expanded.csv  → English lexicon entries
//   2. bsk_dictionary.json   → Burushaski translations (+ English entries where missing)
//   3. dictionaries/*.json   → BSK / SCL / HNO / MVY / PS translations
//   4. seed_english_phrases.js list (inline) → additional handcrafted English phrases
//
// Safe to re-run — all upserts are idempotent (ON CONFLICT DO NOTHING or DO UPDATE).
//
// Run: node server/scripts/import_all_sources.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);

// ── helpers ───────────────────────────────────────────────────────────────────

function slug(en) {
  return en.toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 120);
}

function normaliseEn(s) {
  // Take only the first meaning when a definition has comma-separated senses
  // e.g. "clever, wise, intelligent" → "clever, wise, intelligent" (keep all, it's descriptive)
  return (s || '').trim().toLowerCase();
}

async function fetchAll(table, select) {
  const PAGE = 1000;
  let all = [], from = 0;
  while (true) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table} fetch: ${error.message}`);
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function upsertBatch(table, rows, conflict, batchSize = 100) {
  let count = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflict });
    if (error) {
      console.error(`  !! ${table} batch ${i} error: ${error.message}`);
      continue; // keep going on partial errors
    }
    count += batch.length;
    process.stdout.write(`\r  ${table}: ${count}/${rows.length}...`);
  }
  console.log(`\r  ${table}: ${count} rows upserted.          `);
}

// ── load existing state ───────────────────────────────────────────────────────

async function loadExisting() {
  const entries = await fetchAll('lexicon_entries', 'id,canonical_en');
  const trans   = await fetchAll('translations', 'entry_id,lang_code');
  const ids     = new Set(entries.map(e => e.id));
  const transK  = new Set(trans.map(t => `${t.entry_id}|${t.lang_code}`));
  console.log(`Loaded ${ids.size} existing entries, ${transK.size} existing translations.`);
  return { ids, transK };
}

// ── source 1: CSV ─────────────────────────────────────────────────────────────
// rank,entry,entry_type,frequency_band,category,usage_note

function loadCSV(filepath) {
  const raw   = fs.readFileSync(filepath, 'utf8');
  const lines = raw.split(/\r?\n/).slice(1).filter(l => l.trim());
  const rows  = [];
  for (const line of lines) {
    const cols = line.split(',');
    const rank      = parseInt(cols[0]) || 9999;
    const entry     = (cols[1] || '').trim().replace(/^"|"$/g, '');
    const entryType = (cols[2] || 'word').trim().replace(/^"|"$/g, '');
    const freqBand  = (cols[3] || '').trim().replace(/^"|"$/g, '');
    const category  = (cols[4] || 'general').trim().replace(/^"|"$/g, '');
    if (!entry) continue;
    rows.push({ rank, entry, entryType, freqBand, category });
  }
  return rows;
}

// ── source 2: bsk_dictionary.json ────────────────────────────────────────────
// { entries: [{ bsk, transliteration, urdu, english }] }

function loadBskDict(filepath) {
  const raw = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  return raw.entries || [];
}

// ── source 3: dictionaries/*.json ────────────────────────────────────────────
// { lang_code, words: [{ source, target, transliteration, pos, category }] }

function loadDictionary(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf8'));
}

// ── source 4: handcrafted phrases (inline) ───────────────────────────────────

const HANDCRAFTED = [
  // greetings
  ['how was your day', 'phrase', 'greetings', 5000],
  ['long time no see', 'phrase', 'greetings', 5002],
  ['how is your family', 'phrase', 'greetings', 5003],
  ['welcome to our home', 'phrase', 'greetings', 5005],
  ['please come in', 'phrase', 'greetings', 5006],
  ['please sit down', 'phrase', 'greetings', 5007],
  ['are you alone', 'phrase', 'greetings', 5009],
  ['where are you staying', 'phrase', 'greetings', 5012],
  ['how long are you here for', 'phrase', 'greetings', 5013],
  ['is this your first visit', 'phrase', 'greetings', 5014],
  ['i am a traveler', 'phrase', 'greetings', 5016],
  ['i love this place', 'phrase', 'greetings', 5025],
  ['your country is beautiful', 'phrase', 'greetings', 5026],
  ['i will come back again', 'phrase', 'greetings', 5028],
  // communication
  ['can you help me please', 'phrase', 'communication', 5100],
  ['i do not speak your language', 'phrase', 'communication', 5102],
  ['is there anyone who speaks english', 'phrase', 'communication', 5103],
  ['please write it down', 'phrase', 'communication', 5105],
  ['i understand a little', 'phrase', 'communication', 5108],
  ['can you say that again', 'phrase', 'communication', 5111],
  ['more slowly please', 'phrase', 'communication', 5112],
  ['i do not know', 'phrase', 'communication', 5121],
  ['that is correct', 'phrase', 'communication', 5118],
  ['that is wrong', 'phrase', 'communication', 5119],
  // directions
  ['is this the right way', 'phrase', 'directions', 5205],
  ['at the top of the hill', 'phrase', 'directions', 5207],
  ['by the river', 'phrase', 'directions', 5211],
  ['the road is flooded', 'phrase', 'directions', 5215],
  ['the bridge is broken', 'phrase', 'directions', 5216],
  ['the path is closed', 'phrase', 'directions', 5217],
  ['there is a checkpoint ahead', 'phrase', 'directions', 5218],
  ['you need a permit for this area', 'phrase', 'directions', 5219],
  // food
  ['what do locals eat here', 'phrase', 'food', 5301],
  ['what is the name of this food', 'phrase', 'food', 5303],
  ['this tastes amazing', 'phrase', 'food', 5305],
  ['i cannot eat meat', 'phrase', 'food', 5308],
  ['i only eat halal food', 'phrase', 'food', 5310],
  ['is this vegetarian', 'phrase', 'food', 5311],
  ['can i have warm water', 'phrase', 'food', 5315],
  ['do you have green tea', 'phrase', 'food', 5317],
  ['do you have qehwa', 'phrase', 'food', 5318],
  ['chapati with butter', 'phrase', 'food', 5330],
  // accommodation
  ['is there a guesthouse nearby', 'phrase', 'accommodation', 5400],
  ['can i stay the night', 'phrase', 'accommodation', 5401],
  ['how much for one night', 'phrase', 'accommodation', 5402],
  ['is breakfast included', 'phrase', 'accommodation', 5404],
  ['can i see the room first', 'phrase', 'accommodation', 5408],
  ['do you have a cheaper room', 'phrase', 'accommodation', 5409],
  ['is there hot water in the morning', 'phrase', 'accommodation', 5412],
  ['is there electricity at night', 'phrase', 'accommodation', 5414],
  ['can i charge my phone here', 'phrase', 'accommodation', 5415],
  ['is there wifi', 'phrase', 'accommodation', 5416],
  ['what is the wifi password', 'phrase', 'accommodation', 5417],
  ['where is the toilet', 'phrase', 'accommodation', 5418],
  ['can you wake me up at six', 'phrase', 'accommodation', 5421],
  ['i will leave tomorrow morning', 'phrase', 'accommodation', 5422],
  ['can i store my bag here', 'phrase', 'accommodation', 5423],
  // transport
  ['when is the first bus', 'phrase', 'transport', 5500],
  ['when is the last bus', 'phrase', 'transport', 5501],
  ['where do i get off', 'phrase', 'transport', 5504],
  ['tell me when we arrive', 'phrase', 'transport', 5506],
  ['is this seat taken', 'phrase', 'transport', 5507],
  ['please drive slowly', 'phrase', 'transport', 5510],
  ['wait for me here', 'phrase', 'transport', 5512],
  ['how much to hire a jeep', 'phrase', 'transport', 5514],
  ['i need a horse for the trek', 'phrase', 'transport', 5517],
  ['i missed my bus', 'phrase', 'transport', 5521],
  ['my luggage is lost', 'phrase', 'transport', 5523],
  // shopping
  ['what is your best price', 'phrase', 'shopping', 5600],
  ['is this handmade', 'phrase', 'shopping', 5606],
  ['is this locally made', 'phrase', 'shopping', 5607],
  ['where is the pharmacy', 'phrase', 'shopping', 5614],
  ['do you have painkillers', 'phrase', 'shopping', 5615],
  ['do you have a sim card', 'phrase', 'shopping', 5618],
  // emergency
  ['i need to see a doctor urgently', 'phrase', 'emergency', 5700],
  ['where is the nearest clinic', 'phrase', 'emergency', 5701],
  ['i have been bitten', 'phrase', 'emergency', 5702],
  ['i am having trouble breathing', 'phrase', 'emergency', 5704],
  ['i am vomiting', 'phrase', 'emergency', 5706],
  ['i twisted my ankle', 'phrase', 'emergency', 5709],
  ['i think i have food poisoning', 'phrase', 'emergency', 5710],
  ['is there a hospital in this town', 'phrase', 'emergency', 5712],
  ['i need to be evacuated', 'phrase', 'emergency', 5713],
  ['i am recovering', 'phrase', 'emergency', 5717],
  // trekking
  ['what is the altitude here', 'phrase', 'trekking', 5800],
  ['i have altitude sickness', 'phrase', 'trekking', 5801],
  ['i need to go lower', 'phrase', 'trekking', 5802],
  ['the pass is closed', 'phrase', 'trekking', 5803],
  ['is it safe to cross', 'phrase', 'trekking', 5806],
  ['where is base camp', 'phrase', 'trekking', 5809],
  ['how many hours to the top', 'phrase', 'trekking', 5810],
  ['what is the name of that mountain', 'phrase', 'trekking', 5811],
  ['where can we camp tonight', 'phrase', 'trekking', 5816],
  ['the weather is changing', 'phrase', 'trekking', 5820],
  ['we should turn back', 'phrase', 'trekking', 5821],
  ['storm is coming', 'phrase', 'trekking', 5822],
  ['we need shelter', 'phrase', 'trekking', 5824],
  ['this view is incredible', 'phrase', 'trekking', 5829],
  // culture
  ['what is this festival called', 'phrase', 'culture', 5900],
  ['can i attend the celebration', 'phrase', 'culture', 5902],
  ['should i remove my shoes', 'phrase', 'culture', 5905],
  ['is photography allowed', 'phrase', 'culture', 5906],
  ['may i take your photo', 'phrase', 'culture', 5907],
  ['thank you for letting me visit', 'phrase', 'culture', 5908],
  ['your hospitality is wonderful', 'phrase', 'culture', 5909],
  ['how do you say this in your language', 'phrase', 'culture', 5913],
  ['is this a sacred place', 'phrase', 'culture', 5919],
  // nature
  ['what is the name of this mountain', 'phrase', 'nature', 6000],
  ['what kind of tree is this', 'phrase', 'nature', 6003],
  ['are there snow leopards here', 'phrase', 'nature', 6005],
  ['is this water clean to drink', 'phrase', 'nature', 6007],
  ['when does the snow melt', 'phrase', 'nature', 6010],
  ['the glacier is melting', 'phrase', 'nature', 6011],
  ['when is the apricot season', 'phrase', 'nature', 6013],
  ['there is a landslide on the road', 'phrase', 'nature', 6018],
  ['slope', 'word', 'nature', 6020],
  ['gorge', 'word', 'nature', 6021],
  ['plateau', 'word', 'nature', 6022],
  ['ravine', 'word', 'nature', 6023],
  ['moraine', 'word', 'nature', 6024],
  ['avalanche zone', 'phrase', 'nature', 6025],
  ['snowfield', 'word', 'nature', 6026],
  ['crevasse', 'word', 'nature', 6027],
  ['apricot tree', 'phrase', 'nature', 6030],
  ['walnut tree', 'phrase', 'nature', 6031],
  ['mulberry tree', 'phrase', 'nature', 6032],
  // family
  ['how many people in your family', 'phrase', 'family', 6100],
  ['are your parents well', 'phrase', 'family', 6102],
  ['my father is a farmer', 'phrase', 'family', 6103],
  ['i am the eldest', 'phrase', 'family', 6107],
  ['i am the youngest', 'phrase', 'family', 6108],
  ['this is my husband', 'phrase', 'family', 6110],
  ['this is my wife', 'phrase', 'family', 6111],
  ['we are from the same village', 'phrase', 'family', 6115],
  // religion
  ['when is prayer time', 'phrase', 'religion', 6202],
  ['i am fasting', 'phrase', 'religion', 6204],
  ['it is ramadan', 'phrase', 'religion', 6206],
  ['eid mubarak', 'phrase', 'religion', 6207],
  ['i respect your religion', 'phrase', 'religion', 6209],
  ['inshallah', 'word', 'religion', 6215],
  ['alhamdulillah', 'word', 'religion', 6216],
  ['mashallah', 'word', 'religion', 6217],
  // time
  ['i am in a hurry', 'phrase', 'time', 6300],
  ['we should leave early', 'phrase', 'time', 6304],
  ['i will arrive in two hours', 'phrase', 'time', 6308],
  ['i arrived this morning', 'phrase', 'time', 6312],
  ['always', 'word', 'time', 6316],
  ['sometimes', 'word', 'time', 6317],
  ['never', 'word', 'time', 6318],
  // emotions
  ['i am happy', 'phrase', 'emotions', 6400],
  ['i am worried', 'phrase', 'emotions', 6402],
  ['i am grateful', 'phrase', 'emotions', 6405],
  ['i feel at peace here', 'phrase', 'emotions', 6410],
  ['this is beautiful', 'phrase', 'emotions', 6413],
  ['love', 'word', 'emotions', 6416],
  ['joy', 'word', 'emotions', 6417],
  ['hope', 'word', 'emotions', 6420],
  ['peace', 'word', 'emotions', 6421],
  ['courage', 'word', 'emotions', 6423],
  ['kindness', 'word', 'emotions', 6428],
  ['generosity', 'word', 'emotions', 6429],
  // daily
  ['wake up early', 'phrase', 'daily', 6600],
  ['wash your hands', 'phrase', 'daily', 6603],
  ['cook breakfast', 'phrase', 'daily', 6606],
  ['carry water', 'phrase', 'daily', 6609],
  ['fetch firewood', 'phrase', 'daily', 6610],
  ['light the fire', 'phrase', 'daily', 6611],
  ['milk the cow', 'phrase', 'daily', 6612],
  ['feed the animals', 'phrase', 'daily', 6613],
  ['go to the market', 'phrase', 'daily', 6614],
  ['water the crops', 'phrase', 'daily', 6616],
  ['pick the fruit', 'phrase', 'daily', 6617],
  ['bake bread', 'phrase', 'daily', 6619],
  ['knit', 'word', 'daily', 6620],
  ['weave', 'word', 'daily', 6621],
  ['harvest', 'word', 'daily', 6626],
  // places
  ['ancient fort', 'phrase', 'places', 6700],
  ['historical site', 'phrase', 'places', 6701],
  ['ruins', 'word', 'places', 6702],
  ['museum', 'word', 'places', 6703],
  ['viewpoint', 'word', 'places', 6704],
  ['hot spring', 'phrase', 'places', 6706],
  ['cave', 'word', 'places', 6707],
  ['the old part of the town', 'phrase', 'places', 6709],
  // education
  ['i am learning your language', 'phrase', 'education', 6820],
  ['our language is important', 'phrase', 'education', 6827],
  ['we must preserve our language', 'phrase', 'education', 6829],
  // work
  ['farmer', 'word', 'work', 6900],
  ['shepherd', 'word', 'work', 6901],
  ['carpenter', 'word', 'work', 6908],
  ['weaver', 'word', 'work', 6911],
  ['guide', 'word', 'work', 6916],
  ['porter', 'word', 'work', 6917],
  ['musician', 'word', 'work', 6921],
  ['poet', 'word', 'work', 6922],
  ['storyteller', 'word', 'work', 6923],
  ['healer', 'word', 'work', 6924],
  // objects
  ['mobile phone', 'phrase', 'objects', 7000],
  ['camera', 'word', 'objects', 7003],
  ['map', 'word', 'objects', 7005],
  ['compass', 'word', 'objects', 7006],
  ['passport', 'word', 'objects', 7009],
  ['torch', 'word', 'objects', 7012],
  ['first aid kit', 'phrase', 'objects', 7019],
  ['water filter', 'phrase', 'objects', 7020],
  ['sunglasses', 'word', 'objects', 7021],
  ['umbrella', 'word', 'objects', 7022],
  ['walking stick', 'phrase', 'objects', 7023],
  ['sleeping mat', 'phrase', 'objects', 7024],
];

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const { ids: existingIds, transK: existingTrans } = await loadExisting();

  const newEntries  = new Map(); // id → row
  const newTrans    = new Map(); // `id|lang` → row

  function addEntry(id, en, type, category, rank) {
    if (existingIds.has(id) || newEntries.has(id)) return;
    newEntries.set(id, {
      id,
      type:          type || (en.includes(' ') ? 'phrase' : 'word'),
      canonical_en:  en,
      category:      (category || 'general').toLowerCase().replace(/\s+/g, '_'),
      pos:           null,
      frequency_rank: rank || 9000,
    });
  }

  function addTrans(entryId, langCode, text, roman, confidence, source) {
    if (!text) return;
    const k = `${entryId}|${langCode}`;
    if (existingTrans.has(k) || newTrans.has(k)) return;
    newTrans.set(k, {
      entry_id:   entryId,
      lang_code:  langCode,
      text,
      roman:      roman || null,
      verified:   confidence === 'high',
      confidence: confidence || 'medium',
      source:     source || 'seed_dictionary',
      updated_at: new Date().toISOString(),
    });
  }

  // ── 1. CSV ─────────────────────────────────────────────────────────────────
  console.log('\nProcessing CSV...');
  const csvPath = path.join(__dirname, '../data/everyday_travel_spoken_english_curated_expanded.csv');
  const csvRows = loadCSV(csvPath);
  for (const r of csvRows) {
    const en = normaliseEn(r.entry);
    if (!en) continue;
    const id   = slug(en);
    // Frequency rank from CSV (1 = most common); offset to avoid clashing with existing ranks
    const rank = 10000 + r.rank;
    addEntry(id, en, r.entryType || 'word', r.category, rank);
  }
  console.log(`  CSV: queued ${newEntries.size} new English entries`);

  // ── 2. Handcrafted phrases ─────────────────────────────────────────────────
  console.log('Processing handcrafted phrases...');
  for (const [en, type, category, rank] of HANDCRAFTED) {
    const id = slug(en);
    addEntry(id, en, type, category, rank);
  }
  console.log(`  Handcrafted total (cumulative): ${newEntries.size} new entries`);

  // ── 3. BSK dictionary (urdu-bsk with english glosses) ─────────────────────
  console.log('Processing bsk_dictionary.json...');
  const bskDictPath = path.join(__dirname, '../data/bsk_dictionary.json');
  const bskEntries  = loadBskDict(bskDictPath);

  for (const e of bskEntries) {
    if (!e.english || !e.bsk) continue;
    const en = normaliseEn(e.english);
    if (!en) continue;
    const id = slug(en);
    // Add English entry if missing
    addEntry(id, en, en.includes(' ') ? 'phrase' : 'word', 'vocabulary', 8000);
    // Add BSK translation
    addTrans(id, 'bsk', e.bsk, e.transliteration, 'medium', 'bsk_dictionary');
  }
  console.log(`  BSK dict: cumulative entries: ${newEntries.size}, new trans: ${newTrans.size}`);

  // ── 4. Seed dictionaries (bsk/scl/hno/mvy/ps) ─────────────────────────────
  console.log('Processing seed dictionaries...');
  const dictDir = path.join(__dirname, '../data/dictionaries');
  const dictFiles = fs.readdirSync(dictDir).filter(f => f.endsWith('.json'));

  for (const fname of dictFiles) {
    const dict = loadDictionary(path.join(dictDir, fname));
    const lang = dict.lang_code;
    if (!lang) continue;

    for (const w of (dict.words || [])) {
      if (!w.source || !w.target) continue;
      const en   = normaliseEn(w.source);
      const id   = slug(en);
      // Ensure the English entry exists
      addEntry(id, en, en.includes(' ') ? 'phrase' : 'word', w.category || 'general', 5000);
      // Add translation
      addTrans(id, lang, w.target, w.transliteration || null, 'medium', 'seed_dictionary');
    }
  }
  console.log(`  Dictionaries: cumulative entries: ${newEntries.size}, new trans: ${newTrans.size}`);

  // ── Upload entries ─────────────────────────────────────────────────────────
  const entryRows = Array.from(newEntries.values());
  const transRows = Array.from(newTrans.values());

  console.log(`\nUploading ${entryRows.length} new English entries...`);
  await upsertBatch('lexicon_entries', entryRows, 'id', 200);

  console.log(`Uploading ${transRows.length} new translations...`);
  await upsertBatch('translations', transRows, 'entry_id,lang_code', 100);

  console.log(`\n✓ Done.`);
  console.log(`  English entries added : ${entryRows.length}`);
  console.log(`  Translations added    : ${transRows.length}`);
  console.log(`  Approx total entries  : ~${existingIds.size + entryRows.length}`);
}

main().catch(err => { console.error('\nFatal:', err.message); process.exit(1); });
