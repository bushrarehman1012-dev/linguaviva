const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 });

const LANGUAGE_NAMES = {
  ps: 'Pashto',
  bsk: 'Burushaski',
  scl: 'Shina',
  hno: 'Hindko',
  mvy: 'Kohistani (Indus Kohistani)',
};

const VALID_CATEGORIES = ['greetings', 'travel', 'food', 'emergency', 'numbers', 'family'];

router.get('/:langCode/:category', async (req, res) => {
  const { langCode, category } = req.params;

  if (!LANGUAGE_NAMES[langCode]) return res.status(404).json({ error: 'Language not supported' });
  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'Invalid category', valid: VALID_CATEGORIES });
  }

  const cacheKey = `phrases|${langCode}|${category}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ phrases: cached, source: 'cached' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

  const langName = LANGUAGE_NAMES[langCode];

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt =
      `You are a linguistic expert in the endangered languages of Pakistan (KPK and Gilgit-Baltistan). ` +
      `Generate 8 common ${category} phrases in ${langName}. ` +
      `Return ONLY a valid JSON array. No markdown, no explanation. ` +
      `Each item must have: "english" (English phrase), "translation" (${langName} in native script), ` +
      `"transliteration" (Latin romanization), "note" (short cultural note or empty string). ` +
      `Example: [{"english":"Hello","translation":"سلام","transliteration":"Salaam","note":"Formal greeting"}]`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    let phrases;
    try {
      phrases = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      phrases = match ? JSON.parse(match[0]) : [];
    }

    cache.set(cacheKey, phrases);
    return res.json({ phrases, source: 'ai' });
  } catch (err) {
    console.error('Phrases error:', err.message);
    return res.status(500).json({ error: 'Failed to generate phrases' });
  }
});

module.exports = router;
