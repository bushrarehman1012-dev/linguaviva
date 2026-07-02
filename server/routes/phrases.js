const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');
const { getWordListContext } = require('../data/wordlists');

const router = express.Router();
const cache = new NodeCache({ stdTTL: 3600 });

const LANGUAGE_NAMES = {
  ps: 'Pashto', bsk: 'Burushaski', scl: 'Shina', hno: 'Hindko',
  mvy: 'Indus Kohistani', khw: 'Khowar (Chitrali)', bft: 'Balti',
  wbl: 'Wakhi', trw: 'Torwali', kls: 'Kalasha',
};

const VALID_CATEGORIES = ['greetings', 'travel', 'food', 'emergency', 'numbers', 'family'];
const LOW_RESOURCE = new Set(['bsk', 'scl', 'mvy', 'khw', 'bft', 'wbl', 'trw', 'kls']);

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
  const isLowResource = LOW_RESOURCE.has(langCode);

  // Inject known vocabulary as anchor context
  const categoryWords = {
    greetings: 'hello goodbye yes no thank you please',
    family: 'father mother brother sister child',
    food: 'water bread milk meat food',
    numbers: 'one two three four five',
    travel: 'road mountain river house',
    emergency: 'water fire good',
  };
  const wordContext = getWordListContext(langCode, categoryWords[category] || '');

  const prompt =
    `You are a linguistic expert in the regional languages of Pakistan's KPK and Gilgit-Baltistan.\n` +
    (isLowResource
      ? `IMPORTANT: ${langName} is a low-resource language. Use the verified vocabulary below as anchors. For unknown words, provide a phonetic transliteration rather than fabricating script.\n`
      : '') +
    wordContext +
    `\nGenerate 8 common ${category} phrases in ${langName}.\n` +
    `Return ONLY a valid JSON array. No markdown, no explanation.\n` +
    `Each item: {"english":"...","translation":"${langName} in native script","transliteration":"Latin romanization","note":"short cultural note or empty string"}\n` +
    `Example: [{"english":"Hello","translation":"سلام","transliteration":"Salaam","note":""}]`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
    return res.json({ phrases, source: 'ai', lowResource: isLowResource });
  } catch (err) {
    console.error('Phrases error:', err.message);
    return res.status(500).json({ error: 'Failed to generate phrases' });
  }
});

module.exports = router;
