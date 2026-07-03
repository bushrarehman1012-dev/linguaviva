const express          = require('express');
const correctionsStore = require('../data/corrections');
const supabase         = require('../data/supabase');
const lexicon          = require('../data/lexicon');

const router = express.Router();

const STOP_WORDS = new Set([
  'is','it','the','a','an','are','was','were','be','been',
  'to','of','in','on','at','and','or','for','not',
  'i','you','he','she','we','they','this','that',
]);

async function extractWordCorrections(sourceLang, targetLang, sourcePhrase, targetPhrase) {
  const srcTokens = sourcePhrase.toLowerCase()
    .replace(/[?!.,;:'"؟]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));

  const tgtTokens = targetPhrase.trim().split(/\s+/).filter(w => w.length > 0);

  if (srcTokens.length !== tgtTokens.length || srcTokens.length === 0) return;

  for (let i = 0; i < srcTokens.length; i++) {
    const existing = correctionsStore.get(sourceLang, targetLang, srcTokens[i]);
    if (!existing) {
      await correctionsStore.add(sourceLang, targetLang, srcTokens[i], tgtTokens[i]);
    }
  }
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 120);
}

// Split a multi-sentence text into useful individual phrases for the contribute queue.
// Single word/phrase → returned as-is.
// Multiple sentences → each sentence returned separately.
function extractPhrases(text) {
  const clean = text.trim()
    .replace(/[""'']/g, '')
    .replace(/\s+/g, ' ');

  // Split on sentence-ending punctuation followed by whitespace or end
  const sentences = clean
    .split(/(?<=[.!?])\s+|(?<=[.!?])$/)
    .map(s => s.replace(/[.!?,;:]+$/, '').trim().toLowerCase())
    .filter(s => {
      const words = s.split(/\s+/).filter(w => w.length > 0);
      return words.length >= 1 && words.length <= 20 && s.length >= 2;
    });

  // If we got multiple useful sentences, return them
  if (sentences.length > 1) return sentences;

  // Single phrase (or sentence split didn't help) — return cleaned original
  const single = clean.replace(/[.!?,;:]+$/, '').trim().toLowerCase();
  return single.length >= 1 ? [single] : [];
}

// POST /api/feedback
router.post('/', async (req, res) => {
  const { text, sourceLang, targetLang, translation, transliteration, verdict, correction } = req.body;
  if (!text || !sourceLang || !targetLang || !verdict) {
    return res.status(400).json({ error: 'text, sourceLang, targetLang, verdict required' });
  }

  if (verdict === 'bad') {
    const corrected = correction?.trim();

    if (corrected) {
      // Store the user-supplied correction
      await correctionsStore.add(sourceLang, targetLang, text, corrected);

      if (text.trim().split(/\s+/).length > 1) {
        await extractWordCorrections(sourceLang, targetLang, text, corrected);
      }

      // Bust stale AI cache
      try {
        const cache = require('./translate').cache;
        if (cache) {
          cache.del(`${sourceLang}|${targetLang}|${text.trim()}`);
          cache.del(`${sourceLang}|${targetLang}|${text.trim().toLowerCase()}`);
        }
      } catch {}
    }

    // Always: if the source is English, queue the phrase(s) in the contribute system
    // so community members can provide the correct translation.
    if (sourceLang === 'en') {
      const phrases = extractPhrases(text);
      for (const phrase of phrases) {
        const id   = slug(phrase);
        const type = phrase.includes(' ') ? 'phrase' : 'word';
        try {
          await lexicon.addEntry(id, phrase, type, 'user_submitted', 8500);
        } catch (e) {
          console.error('[feedback] addEntry error:', e.message);
        }
      }
    }
  }

  // Log to Supabase (non-blocking — don't fail the request if this errors)
  supabase.from('feedback').insert({
    source_lang:   sourceLang,
    target_lang:   targetLang,
    original_text: text.trim(),
    translation:   translation || '',
    verdict,
    correction:    correction?.trim() || null,
  }).then(({ error }) => {
    if (error) console.error('[feedback] supabase log error:', error.message);
  });

  res.json({ ok: true });
});

// GET /api/feedback/stats
router.get('/stats', async (req, res) => {
  const { count: total }       = await supabase.from('feedback').select('*', { count: 'exact', head: true });
  const { count: good }        = await supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('verdict', 'good');
  const { count: bad }         = await supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('verdict', 'bad');
  const { count: corrections } = await supabase.from('corrections').select('*', { count: 'exact', head: true });
  res.json({ total: total || 0, good: good || 0, bad: bad || 0, active_corrections: corrections || 0 });
});

module.exports = router;
