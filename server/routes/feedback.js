const express = require('express');
const fs = require('fs');
const path = require('path');
const correctionsStore = require('../data/corrections');

const router = express.Router();
const FEEDBACK_FILE = path.join(__dirname, '../data/feedback.json');

// Stop-words we skip when trying to align words across languages
const STOP_WORDS = new Set([
  'is', 'it', 'the', 'a', 'an', 'are', 'was', 'were', 'be', 'been',
  'to', 'of', 'in', 'on', 'at', 'and', 'or', 'for', 'not',
  'i', 'you', 'he', 'she', 'we', 'they', 'this', 'that',
]);

/**
 * When a phrase correction is submitted, try to extract individual word pairs.
 * Only does direct 1-to-1 alignment (same token count) so we never save bad guesses.
 */
function extractWordCorrections(sourceLang, targetLang, sourcePhrase, targetPhrase) {
  const srcTokens = sourcePhrase.toLowerCase()
    .replace(/[?!.,;:'"؟]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  const tgtTokens = targetPhrase.trim()
    .split(/\s+/)
    .filter(w => w.length > 0);

  // Only align when 1-to-1 mapping is unambiguous
  if (srcTokens.length !== tgtTokens.length || srcTokens.length === 0) return;

  for (let i = 0; i < srcTokens.length; i++) {
    // Don't overwrite an existing community correction
    const existing = correctionsStore.get(sourceLang, targetLang, srcTokens[i]);
    if (!existing) {
      correctionsStore.add(sourceLang, targetLang, srcTokens[i], tgtTokens[i]);
    }
  }
}

function loadFeedback() {
  try {
    if (!fs.existsSync(FEEDBACK_FILE)) return { entries: [] };
    const text = fs.readFileSync(FEEDBACK_FILE, 'utf8');
    return JSON.parse(text);
  } catch {
    return { entries: [] };
  }
}

function saveFeedback(data) {
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// POST /api/feedback
// Body: { text, sourceLang, targetLang, translation, transliteration, verdict: 'good'|'bad', correction?: string }
router.post('/', (req, res) => {
  const { text, sourceLang, targetLang, translation, transliteration, verdict, correction } = req.body;
  if (!text || !sourceLang || !targetLang || !verdict) {
    return res.status(400).json({ error: 'text, sourceLang, targetLang, verdict required' });
  }

  if (verdict === 'bad' && correction && correction.trim()) {
    const corrected = correction.trim();

    // Save the correction for this exact phrase/word
    correctionsStore.add(sourceLang, targetLang, text, corrected);

    // For multi-word phrases, try to extract individual word corrections
    const srcWords = text.trim().split(/\s+/);
    if (srcWords.length > 1) {
      extractWordCorrections(sourceLang, targetLang, text, corrected);
    }

    // Bust the stale AI cache entry
    try {
      const cache = require('./translate').cache;
      if (cache) {
        cache.del(`${sourceLang}|${targetLang}|${text.trim()}`);
        cache.del(`${sourceLang}|${targetLang}|${text.trim().toLowerCase()}`);
      }
    } catch {}
  }

  const data = loadFeedback();
  data.entries.push({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    text: text.trim(),
    sourceLang,
    targetLang,
    translation: translation || '',
    transliteration: transliteration || '',
    verdict,
    correction: correction || '',
    promoted: false,
  });
  saveFeedback(data);

  res.json({ ok: true, total: data.entries.length });
});

// GET /api/feedback/stats
router.get('/stats', (req, res) => {
  const data = loadFeedback();
  const good = data.entries.filter(e => e.verdict === 'good').length;
  const bad  = data.entries.filter(e => e.verdict === 'bad').length;
  const corrCount = data.entries.filter(e => e.verdict === 'bad' && e.correction).length;
  const pending = data.entries.filter(e => e.verdict === 'bad' && e.correction && !e.promoted).length;
  res.json({ total: data.entries.length, good, bad, corrections: corrCount, pending_review: pending, active_corrections: correctionsStore.size() });
});

// GET /api/feedback/pending
router.get('/pending', (req, res) => {
  const data = loadFeedback();
  const pending = data.entries.filter(e => e.verdict === 'bad' && e.correction && !e.promoted);
  res.json({ count: pending.length, entries: pending });
});

module.exports = router;
