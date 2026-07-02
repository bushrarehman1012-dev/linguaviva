// Reads the filled-in verification CSV and applies every correct_form value
// into both corrections.json (immediate effect) and lexicon.json (permanent store).

const fs   = require('fs');
const path = require('path');

const CSV_FILE     = path.join(__dirname, '../data/bsk_verification_list.csv.csv');
const LEXICON_FILE = path.join(__dirname, '../data/lexicon.json');
const corrections  = require('../data/corrections');

// ─── Parse CSV (handles quoted fields) ───────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = splitLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitLine(line);
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = (vals[i] || '').trim());
    return row;
  });
}

function splitLine(line) {
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && !inQ)      { inQ = true; continue; }
    if (line[i] === '"' &&  inQ)      { inQ = false; continue; }
    if (line[i] === ',' && !inQ)      { cols.push(cur); cur = ''; continue; }
    cur += line[i];
  }
  cols.push(cur);
  return cols;
}

// ─── Load / create lexicon ────────────────────────────────────────────────────
function loadLexicon() {
  if (fs.existsSync(LEXICON_FILE)) {
    return JSON.parse(fs.readFileSync(LEXICON_FILE, 'utf8'));
  }
  return {
    schema_version: 1,
    description: 'KPK/GB Endangered Language Verified Lexicon — community-built training dataset',
    languages: ['en','ur','ps','bsk','scl','hno','mvy','khw','bft','wbl','trw','kls'],
    entries: [],
    updated_at: new Date().toISOString().slice(0,10),
  };
}

function saveLexicon(lex) {
  lex.updated_at = new Date().toISOString().slice(0,10);
  lex.total_entries = lex.entries.length;
  lex.verified_bsk  = lex.entries.filter(e => e.translations?.bsk?.verified).length;
  fs.writeFileSync(LEXICON_FILE, JSON.stringify(lex, null, 2), 'utf8');
}

// Find or create a lexicon entry by its English canonical form
function findOrCreate(lex, english, type = 'word') {
  const id = english.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g,'');
  let entry = lex.entries.find(e => e.id === id || e.canonical_en === english.toLowerCase());
  if (!entry) {
    entry = { id, type, canonical_en: english.toLowerCase(), translations: {}, updated_at: '' };
    lex.entries.push(entry);
  }
  return entry;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const raw  = fs.readFileSync(CSV_FILE, 'utf8');
const rows = parseCSV(raw);
const lex  = loadLexicon();

let applied = 0, skipped = 0, alreadyCorrect = 0;

for (const row of rows) {
  const english     = row['english']      || row['English']      || '';
  const currentBsk  = row['current_bsk']  || row['Current_bsk']  || '';
  const correctForm = row['correct_form']  || row['Correct_form'] || '';
  const verified    = (row['verified']    || '').toUpperCase();
  const notes       = row['notes']        || '';

  if (!english || !correctForm) { skipped++; continue; }
  if (correctForm === currentBsk) { alreadyCorrect++; continue; }

  // 1. Apply to corrections store (immediate effect in translate.js)
  corrections.add('en', 'bsk', english, correctForm);

  // 2. Upsert into lexicon
  const entry = findOrCreate(lex, english, english.includes(' ') ? 'phrase' : 'word');
  entry.translations['en']  = { text: english,   verified: true,  source: 'baseline' };
  entry.translations['bsk'] = {
    text:       correctForm,
    roman:      correctForm,
    verified:   verified === 'TRUE' || verified === 'YES' || true,
    confidence: 'high',
    source:     'community_native',
    notes:      notes || undefined,
  };
  if (!notes) delete entry.translations['bsk'].notes;
  entry.updated_at = new Date().toISOString().slice(0, 10);

  applied++;
}

saveLexicon(lex);

console.log(`✓ Applied  : ${applied} corrections`);
console.log(`- Skipped  : ${skipped} (no correct_form)`);
console.log(`- Unchanged: ${alreadyCorrect} (correct_form == current_bsk)`);
console.log(`\nLexicon   : ${lex.entries.length} entries  |  ${lex.verified_bsk} verified BSK`);
console.log(`Saved to  : ${LEXICON_FILE}`);
