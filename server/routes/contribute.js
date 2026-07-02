const express = require('express');
const fs      = require('fs');
const path    = require('path');
const lexicon = require('../data/lexicon');

const router        = express.Router();
const LEXICON_FILE  = path.join(__dirname, '../data/lexicon.json');
const CONTRIB_FILE  = path.join(__dirname, '../data/contributions.json');

// Auto-verify when this many people agree on the same translation
const CONSENSUS_THRESHOLD = 2;

function loadContribs() {
  try {
    if (!fs.existsSync(CONTRIB_FILE)) return { entries: [] };
    return JSON.parse(fs.readFileSync(CONTRIB_FILE, 'utf8'));
  } catch { return { entries: [] }; }
}

function saveContribs(data) {
  fs.writeFileSync(CONTRIB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function loadLex() {
  return JSON.parse(fs.readFileSync(LEXICON_FILE, 'utf8'));
}

function saveLex(lex) {
  lex.updated_at    = new Date().toISOString().slice(0,10);
  lex.total_entries = lex.entries.length;
  lex.verified_bsk  = lex.entries.filter(e => e.translations?.bsk?.verified).length;
  lex.pending_bsk   = lex.entries.filter(e => !e.translations?.bsk).length;
  fs.writeFileSync(LEXICON_FILE, JSON.stringify(lex, null, 2), 'utf8');
  lexicon.reload(); // refresh in-memory index
}

// GET /api/contribute/queue?category=&targetLang=bsk&limit=20
// Returns unverified entries needing translation
router.get('/queue', (req, res) => {
  const { category, targetLang = 'bsk', limit = 20, type } = req.query;
  const lex  = loadLex();

  let entries = lex.entries.filter(e => {
    const t = e.translations?.[targetLang];
    // Include if: no translation yet, OR translation exists but is not verified
    return !t || !t.verified;
  });

  if (category && category !== 'all') entries = entries.filter(e => e.category === category);
  if (type && type !== 'all')         entries = entries.filter(e => e.type === type);

  // Sort by frequency rank (most common first), shuffle within same rank to vary per contributor
  entries = entries
    .sort((a, b) => (a.frequency_rank || 9999) - (b.frequency_rank || 9999) || Math.random() - 0.5)
    .slice(0, Number(limit));

  res.json({
    count:      entries.length,
    targetLang,
    entries: entries.map(e => ({
      id:          e.id,
      english:     e.canonical_en,
      type:        e.type,
      pos:         e.pos,
      category:    e.category,
      // Show how many people have already contributed (without revealing what they said)
      contributions: (e.pending_contributions || []).length,
    })),
  });
});

// GET /api/contribute/stats?targetLang=bsk
router.get('/stats', (req, res) => {
  const { targetLang = 'bsk' } = req.query;
  const lex      = loadLex();
  const total    = lex.entries.length;
  const verified = lex.entries.filter(e => e.translations?.[targetLang]?.verified).length;
  const pending  = lex.entries.filter(e => !e.translations?.[targetLang]).length;

  const cats = {};
  for (const e of lex.entries) {
    const c = e.category || 'uncategorised';
    if (!cats[c]) cats[c] = { total: 0, verified: 0 };
    cats[c].total++;
    if (e.translations?.[targetLang]?.verified) cats[c].verified++;
  }

  const contribs = loadContribs();
  const langSubmissions = contribs.entries.filter(c => c.targetLang === targetLang).length;
  res.json({ total, verified, pending, categories: cats, total_submissions: langSubmissions });
});

// GET /api/contribute/categories?targetLang=bsk
router.get('/categories', (req, res) => {
  const { targetLang = 'bsk' } = req.query;
  const lex  = loadLex();
  const cats = {};
  for (const e of lex.entries) {
    const c = e.category || 'uncategorised';
    if (!cats[c]) cats[c] = { total: 0, pending: 0 };
    cats[c].total++;
    if (!e.translations?.[targetLang]?.verified) cats[c].pending++;
  }
  res.json(cats);
});

// POST /api/contribute
// Body: { entryId, targetLang, text, roman?, notes?, contributorTag? }
router.post('/', (req, res) => {
  const { entryId, targetLang = 'bsk', text, roman, notes, contributorTag } = req.body;
  if (!entryId || !text) return res.status(400).json({ error: 'entryId and text required' });

  const lex   = loadLex();
  const entry = lex.entries.find(e => e.id === entryId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  // Record submission
  const submission = {
    id:             `${entryId}_${Date.now()}`,
    entryId,
    targetLang,
    text:           text.trim(),
    roman:          (roman || text).trim(),
    notes:          notes || '',
    contributorTag: contributorTag || 'anonymous',
    timestamp:      new Date().toISOString(),
    status:         'pending',
  };

  const contribs = loadContribs();
  contribs.entries.push(submission);
  saveContribs(contribs);

  // Track on the lexicon entry
  if (!entry.pending_contributions) entry.pending_contributions = [];
  entry.pending_contributions.push({ text: text.trim(), roman: (roman || text).trim(), timestamp: new Date().toISOString() });

  // Auto-promote if CONSENSUS_THRESHOLD people submitted the same translation
  const normalised = text.trim().toLowerCase();
  const matchCount = entry.pending_contributions.filter(c => c.text.toLowerCase() === normalised).length;
  let promoted = false;

  if (matchCount >= CONSENSUS_THRESHOLD) {
    entry.translations[targetLang] = {
      text:       text.trim(),
      roman:      (roman || text).trim(),
      verified:   true,
      confidence: 'community',
      source:     'community_consensus',
      notes:      notes || undefined,
    };
    if (!notes) delete entry.translations[targetLang].notes;
    // Mark all matching submissions as promoted
    contribs.entries
      .filter(c => c.entryId === entryId && c.text.toLowerCase() === normalised)
      .forEach(c => c.status = 'promoted');
    saveContribs(contribs);
    promoted = true;
  }

  saveLex(lex);

  res.json({
    ok: true,
    promoted,
    message: promoted
      ? `Consensus reached — "${text.trim()}" is now the verified ${targetLang} translation.`
      : `Submission saved. ${CONSENSUS_THRESHOLD - matchCount} more agreement(s) needed to auto-verify.`,
    matchCount,
    threshold: CONSENSUS_THRESHOLD,
  });
});

// POST /api/contribute/verify  (admin: directly verify a pending entry)
router.post('/verify', (req, res) => {
  const { entryId, targetLang = 'bsk', text, roman, notes } = req.body;
  if (!entryId || !text) return res.status(400).json({ error: 'entryId and text required' });

  const lex   = loadLex();
  const entry = lex.entries.find(e => e.id === entryId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  entry.translations[targetLang] = {
    text:       text.trim(),
    roman:      (roman || text).trim(),
    verified:   true,
    confidence: 'high',
    source:     'admin_verified',
    notes:      notes || undefined,
  };
  if (!notes) delete entry.translations[targetLang].notes;

  saveLex(lex);
  res.json({ ok: true, entry: entry.canonical_en, translation: text.trim() });
});

module.exports = router;
