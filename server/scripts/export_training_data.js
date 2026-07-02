// Exports the verified lexicon as training data pairs.
// Outputs:
//   training_data.jsonl  — one JSON object per line, standard LLM fine-tune format
//   training_data.csv    — human-readable spreadsheet

const fs   = require('fs');
const path = require('path');

const LEXICON = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/lexicon.json'), 'utf8'));
const OUT_DIR = path.join(__dirname, '../data/training');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR);

const pairs = [];

for (const entry of LEXICON.entries) {
  const en = entry.translations?.en?.text || entry.canonical_en;
  if (!en) continue;

  for (const [lang, t] of Object.entries(entry.translations || {})) {
    if (lang === 'en') continue;
    if (!t.text || !t.verified) continue;

    // Both directions
    pairs.push({ source_lang: 'en', target_lang: lang, source: en, target: t.text, roman: t.roman || '', confidence: t.confidence || 'medium', source_type: t.source || 'unknown', type: entry.type, category: entry.category || '' });
    pairs.push({ source_lang: lang, target_lang: 'en', source: t.text, target: en, roman: '', confidence: t.confidence || 'medium', source_type: t.source || 'unknown', type: entry.type, category: entry.category || '' });
  }
}

// JSONL — standard format for LLM fine-tuning
const jsonlLines = pairs.map(p => JSON.stringify({
  messages: [
    { role: 'user',      content: `Translate from ${p.source_lang} to ${p.target_lang}: ${p.source}` },
    { role: 'assistant', content: p.target },
  ],
  metadata: { confidence: p.confidence, source: p.source_type, type: p.type },
}));

fs.writeFileSync(path.join(OUT_DIR, 'training_data.jsonl'), jsonlLines.join('\n'), 'utf8');

// CSV
const csvHeader = 'source_lang,target_lang,source,target,roman,confidence,source_type,type,category';
const csvLines  = [csvHeader, ...pairs.map(p =>
  [p.source_lang, p.target_lang, p.source, p.target, p.roman, p.confidence, p.source_type, p.type, p.category]
    .map(v => `"${String(v || '').replace(/"/g, '""')}"`)
    .join(',')
)];

fs.writeFileSync(path.join(OUT_DIR, 'training_data.csv'), csvLines.join('\n'), 'utf8');

console.log(`Training pairs exported: ${pairs.length}`);
console.log(`  JSONL → ${OUT_DIR}/training_data.jsonl`);
console.log(`  CSV   → ${OUT_DIR}/training_data.csv`);
console.log(`\nBreakdown by language:`);
const byLang = {};
for (const p of pairs) {
  if (p.source_lang === 'en') {
    byLang[p.target_lang] = (byLang[p.target_lang] || 0) + 1;
  }
}
for (const [lang, count] of Object.entries(byLang).sort((a,b) => b[1]-a[1])) {
  console.log(`  en→${lang}: ${count} pairs`);
}
