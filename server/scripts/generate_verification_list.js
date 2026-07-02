// Generates a verification CSV of all current BSK vocabulary entries.
// Pulls directly from wordlists.js and corrections.json so it always reflects
// the latest state. Columns:
//   english        — source phrase/word
//   current_bsk    — what the app currently returns
//   community_corrected — if a user has already submitted a correction
//   in_dict        — whether any token appears in the Research Academy dictionary
//   verified       — leave blank; fill in TRUE/FALSE when reviewing
//   correct_form   — fill in the right BSK form if current is wrong
//   notes          — any notes

const fs   = require('fs');
const path = require('path');

const dict = require('../data/bsk_dictionary.json');
const { WORD_LISTS } = require('../data/wordlists');
const corrections = require('../data/corrections');

const dictTranslits = new Set(
  dict.entries.map(e => (e.transliteration || '').toLowerCase().trim())
);

const bskWordlist = WORD_LISTS['bsk'];

// Pull all entries from the live BSK wordlist (English keys only, deduplicated)
const seen = new Set();
const entries = [];
for (const [eng, bsk] of Object.entries(bskWordlist)) {
  // Skip non-English keys (Urdu/Arabic script used for Urdu→BSK lookups)
  if (/[^\x00-\x7F]/.test(eng)) continue;
  // Skip the "?" duplicate variants — same phrase, just punctuation
  const baseEng = eng.replace(/\?$/, '').trimEnd();
  if (seen.has(baseEng)) continue;
  seen.add(baseEng);
  entries.push([baseEng, bsk]);
}

function inDict(bsk) {
  return bsk.split(/\s+/).some(w => dictTranslits.has(w.toLowerCase())) ? 'YES' : 'NO';
}

function getCommunityCorrection(eng) {
  const key = `en|bsk|${eng.trim().toLowerCase()}`;
  // corrections.getByKey normalises case internally
  const c = corrections.getByKey(key);
  return c ? c.translation : '';
}

// Build CSV
const header = 'english,current_bsk,community_corrected,in_research_academy_dict,verified,correct_form,notes';
const csvLines = [header];

for (const [eng, bsk] of entries) {
  const communityFix = getCommunityCorrection(eng);
  const row = [eng, bsk, communityFix, inDict(bsk), '', '', '']
    .map(v => `"${String(v).replace(/"/g, '""')}"`)
    .join(',');
  csvLines.push(row);
}

const csvPath = path.join(__dirname, '../data/bsk_verification_list.csv');
fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');

const total        = entries.length;
const dictHits     = entries.filter(([, bsk]) => inDict(bsk) === 'YES').length;
const corrected    = entries.filter(([eng]) => getCommunityCorrection(eng)).length;

console.log(`Written: ${csvPath}`);
console.log(`Total entries : ${total}`);
console.log(`In dictionary : ${dictHits}/${total}`);
console.log(`Community-corrected so far: ${corrected}/${total}`);
