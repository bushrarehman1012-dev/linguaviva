// Fixes rows 111–193 in bsk_verification_list.csv.csv
// These are Urdu-keyed entries whose column A was corrupted by Excel
// saving UTF-8 Urdu text as Latin-1.  We replace each with the correct English.

const fs   = require('fs');
const path = require('path');

const IN  = path.join(__dirname, '../data/bsk_verification_list.csv.csv');
const OUT = path.join(__dirname, '../data/bsk_verification_list.csv');

// Decoded manually — row number (1-based, header = row 1) → correct English
const ENGLISH_FIX = {
  111: 'water',
  112: 'fire',
  113: 'house',
  114: 'man',
  115: 'woman',
  116: 'child',
  117: 'sun',
  118: 'moon',
  119: 'yes',
  120: 'no',
  121: 'food',
  122: 'bread',
  123: 'milk',
  124: 'meat',
  125: 'fish',
  126: 'tree',
  127: 'stone',
  128: 'road',
  129: 'village',
  130: 'father',
  131: 'mother',
  132: 'brother',
  133: 'sister',
  134: 'one',
  135: 'two',
  136: 'three',
  137: 'four',
  138: 'five',
  139: 'good',
  140: 'bad',
  141: 'big',
  142: 'small',
  143: 'white',
  144: 'black',
  145: 'red',
  146: 'hot',
  147: 'cold',
  148: 'new',
  149: 'old',
  150: 'come',
  151: 'go',
  152: 'cook / prepare food',
  153: 'drink',
  154: 'sleep',
  155: 'name',
  156: 'your',
  157: 'my',
  158: 'what',
  159: 'where',
  160: 'who',
  161: 'love',
  162: 'friend',
  163: 'thank you',
  164: 'dog',
  165: 'bird',
  166: 'goat',
  167: 'mountain',
  168: 'river',
  169: 'sky',
  170: 'heart',
  171: 'eye',
  172: 'hand',
  173: 'head',
  174: 'mouth',
  175: 'ear',
  176: 'day',
  177: 'night',
  178: 'today',
  179: 'tomorrow',
  180: 'hello',
  181: 'goodbye',
  182: 'where are you',
  183: 'what is your name',
  184: 'how are you',
  185: 'i am fine',
  186: "i don't understand",
  187: 'speak slowly',
  188: 'help me',
  189: 'i am hungry',
  190: 'i want water',
  191: 'what is this',
  192: 'how much',
  193: 'i am sick',
};

// BSK fixes for cells also corrupted by encoding (e.g. "dirÃ¡as" → "dirás")
const BSK_FIX = {
  152: 'dirás',   // cook — accented á was mangled
};

const raw   = fs.readFileSync(IN, 'latin1'); // read as latin-1 to get raw bytes
const lines = raw.split(/\r?\n/);

const fixed = lines.map((line, idx) => {
  const rowNum = idx + 1; // header is row 1, data starts row 2
  if (!ENGLISH_FIX[rowNum]) return line;

  // Split on comma, but respect quoted fields
  const cols = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"' && !inQ) { inQ = true; continue; }
    if (line[i] === '"' &&  inQ) { inQ = false; continue; }
    if (line[i] === ',' && !inQ) { cols.push(cur); cur = ''; continue; }
    cur += line[i];
  }
  cols.push(cur);

  // Replace column A with decoded English
  cols[0] = ENGLISH_FIX[rowNum];

  // Fix corrupted BSK column (column B) if needed
  if (BSK_FIX[rowNum]) cols[1] = BSK_FIX[rowNum];

  return cols.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',');
});

fs.writeFileSync(OUT, fixed.join('\n'), 'utf8');
console.log(`Written: ${OUT}`);

// Report what was fixed
const fixedRows = Object.keys(ENGLISH_FIX).length;
const bskFixed  = Object.keys(BSK_FIX).length;
console.log(`Fixed column A in ${fixedRows} rows`);
console.log(`Fixed BSK encoding in ${bskFixed} rows`);
console.log(`\nSample fixes:`);
for (const [row, eng] of Object.entries(ENGLISH_FIX).slice(0, 5)) {
  console.log(`  Row ${row}: "${eng}"`);
}
