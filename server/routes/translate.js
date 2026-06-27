const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');

const router = express.Router();
const cache = new NodeCache({ stdTTL: 600 });

const LANGUAGE_NAMES = {
  ps: 'Pashto',
  bsk: 'Burushaski',
  scl: 'Shina',
  hno: 'Hindko',
  mvy: 'Kohistani (Indus Kohistani)',
  en: 'English',
};

router.post('/', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ error: 'text, sourceLang, and targetLang are required' });
  }
  if (!text.trim()) return res.json({ translation: '', source: 'none' });

  const cacheKey = `${sourceLang}|${targetLang}|${text.trim()}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ translation: cached, source: 'ai_cached' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured', source: 'none' });

  const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt =
      `You are a linguistic expert specializing in the endangered languages of Pakistan's KPK and Gilgit-Baltistan regions. ` +
      `Translate accurately and preserve cultural nuance. ` +
      `For low-resource languages (Burushaski, Shina, Hindko, Kohistani), use your best knowledge. ` +
      `Return ONLY the translation. No explanations, no alternatives.\n\n` +
      `Translate from ${sourceName} to ${targetName}:\n\n${text.trim()}`;

    const result = await model.generateContent(prompt);
    const translation = result.response.text().trim();

    if (translation) {
      cache.set(cacheKey, translation);
      return res.json({ translation, source: 'ai' });
    }

    return res.json({ translation: '', source: 'none' });
  } catch (err) {
    console.error('Translation error:', err.message);
    return res.status(500).json({ error: 'Translation failed', source: 'none' });
  }
});

module.exports = router;
