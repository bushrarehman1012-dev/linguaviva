const express = require('express');
const lexicon  = require('../data/lexicon');

const router = express.Router();
const CONSENSUS_THRESHOLD = 2;

// GET /api/contribute/queue?targetLang=bsk&limit=30&category=food
router.get('/queue', (req, res) => {
  const { targetLang = 'bsk', limit = 30, category } = req.query;
  const entries = lexicon.getPending(targetLang, category)
    .slice(0, Number(limit))
    .map(e => ({
      id:             e.id,
      english:        e.canonical_en,
      type:           e.type,
      pos:            e.pos,
      category:       e.category,
      frequency_rank: e.frequency_rank,
    }));
  res.json({ count: entries.length, targetLang, entries });
});

// GET /api/contribute/stats?targetLang=bsk
router.get('/stats', async (req, res) => {
  const { targetLang = 'bsk' } = req.query;
  const s    = lexicon.getStats(targetLang);
  const cats = lexicon.getCategoryStats(targetLang);
  const submissions = await lexicon.getTotalSubmissions(targetLang);
  res.json({ ...s, categories: cats, total_submissions: submissions });
});

// GET /api/contribute/categories?targetLang=bsk
router.get('/categories', (req, res) => {
  const { targetLang = 'bsk' } = req.query;
  res.json(lexicon.getCategoryStats(targetLang));
});

// POST /api/contribute
router.post('/', async (req, res) => {
  const { entryId, targetLang = 'bsk', text, roman, notes, contributorTag } = req.body;
  if (!entryId || !text) return res.status(400).json({ error: 'entryId and text required' });

  const entry = lexicon.getEntry(entryId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  try {
    await lexicon.recordContribution(entryId, targetLang, text, { roman, notes, contributorTag });

    const normalised = text.trim().toLowerCase();
    const matchCount = await lexicon.getContributionCount(entryId, targetLang, normalised);
    let promoted = false;

    if (matchCount >= CONSENSUS_THRESHOLD) {
      await lexicon.promoteContributions(entryId, targetLang, normalised);
      await lexicon.addTranslation(entryId, targetLang, text.trim(), {
        roman, notes,
        verified:   true,
        confidence: 'community',
        source:     'community_consensus',
      });
      promoted = true;
    }

    res.json({
      ok: true,
      promoted,
      message: promoted
        ? `Consensus reached — "${text.trim()}" is now verified.`
        : `Saved. ${CONSENSUS_THRESHOLD - matchCount} more agreement(s) needed to auto-verify.`,
      matchCount,
      threshold: CONSENSUS_THRESHOLD,
    });
  } catch (err) {
    console.error('contribute POST error:', err);
    res.status(500).json({ error: 'Could not save contribution.' });
  }
});

// POST /api/contribute/verify  (admin: directly verify an entry)
router.post('/verify', async (req, res) => {
  const { entryId, targetLang = 'bsk', text, roman, notes } = req.body;
  if (!entryId || !text) return res.status(400).json({ error: 'entryId and text required' });

  const entry = lexicon.getEntry(entryId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  try {
    await lexicon.addTranslation(entryId, targetLang, text.trim(), {
      roman, notes,
      verified:   true,
      confidence: 'high',
      source:     'admin_verified',
    });
    res.json({ ok: true, entry: entry.canonical_en, translation: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
