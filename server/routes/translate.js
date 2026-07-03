const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const NodeCache = require('node-cache');
const https = require('https');
const { getWordListContext } = require('../data/wordlists');
const { getDictionaryContext } = require('../data/bskDictionary');
const { getMasterContext } = require('../data/masterLookup');
const corrections = require('../data/corrections');
const lexicon = require('../data/lexicon');

// MyMemory free API (Google Translate-backed) for languages it supports
const MYMEMORY_LANGS = new Set(['ps', 'ur']); // Pashto & Urdu supported by Google Translate

// MyMemory uses locale codes for some languages
const MM_LANG = { ps: 'ps-AF', ur: 'ur-PK', en: 'en-US' };
function myMemoryTranslate(text, sourceLang, targetLang) {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(text);
    const src = MM_LANG[sourceLang] || sourceLang;
    const tgt = MM_LANG[targetLang] || targetLang;
    const url = `https://api.mymemory.translated.net/get?q=${encoded}&langpair=${src}|${tgt}&de=bushrarehman1012@gmail.com`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.responseStatus === 200 && parsed.responseData?.translatedText) {
            resolve(parsed.responseData.translatedText);
          } else {
            resolve(null);
          }
        } catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(8000, () => { req.destroy(); resolve(null); });
  });
}

const router = express.Router();
const cache = new NodeCache({ stdTTL: 600 });
const validateCache = new NodeCache({ stdTTL: 3600 });

const LANGUAGE_NAMES = {
  ps: 'Pashto', bsk: 'Burushaski', scl: 'Shina', hno: 'Hindko',
  mvy: 'Indus Kohistani', khw: 'Khowar (Chitrali)', bft: 'Balti',
  wbl: 'Wakhi', trw: 'Torwali', kls: 'Kalasha', en: 'English', ur: 'Urdu',
};

const LOW_RESOURCE = new Set(['bsk', 'scl', 'mvy', 'khw', 'bft', 'wbl', 'trw', 'kls']);

// Languages that should display in Nastaliq Arabic script (RTL) but often return Latin from Gemini
const NASTALIQ_LANGS = new Set(['bsk', 'scl', 'hno', 'mvy', 'khw', 'trw']);
// ps/ur already return Nastaliq; kls is Latin-only by design; wbl is Latin/Cyrillic; bft is Tibetan

function isLatinOnly(str) {
  return str && !/[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(str);
}

async function romanToNastaliq(model, roman, langName) {
  try {
    const result = await model.generateContent(
      `You are a ${langName} script expert. Convert this ${langName} text (in Latin romanization) to ${langName} written in Nastaliq Arabic script as used in Pakistan.\n` +
      `Latin: "${roman}"\n` +
      `Return ONLY valid JSON: {"nastaliq":"<Nastaliq text>"}\nNo explanation, no markdown.`
    );
    const raw = result.response.text().trim();
    let p = null;
    try { p = JSON.parse(raw); } catch {}
    if (!p) { const m = raw.match(/\{[\s\S]*\}/); if (m) try { p = JSON.parse(m[0]); } catch {} }
    const n = (p?.nastaliq || '').trim();
    return (n && !isLatinOnly(n)) ? n : null;
  } catch { return null; }
}

// Apply Nastaliq conversion to any payload whose translation is still Latin,
// for languages that should display in Arabic script. Updates the cache so the
// converted version is served on subsequent hits without another Gemini call.
async function withNastaliq(payload, targetLang, targetName, cKey) {
  if (!NASTALIQ_LANGS.has(targetLang) || !payload.translation || !isLatinOnly(payload.translation)) {
    return payload;
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return payload;
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const nastaliq = await romanToNastaliq(model, payload.translation, targetName);
    if (nastaliq) {
      const updated = { ...payload, translation: nastaliq, transliteration: payload.transliteration || payload.translation };
      if (cKey) cache.set(cKey, updated);
      return updated;
    }
  } catch {}
  return payload;
}

// Split a compound input into individual sentences so each can be looked up independently.
// Handles "where are you?How are you?" (no space), "where are you? How are you?", etc.
// Punctuation is stripped (treated as separators, not content).
function splitSentences(text) {
  return text
    .replace(/([?!.])\s*/g, '$1\n')        // newline after each sentence-ender
    .split('\n')
    .map(s => s.replace(/[?!.,;:'"]+$/g, '').trim())  // strip trailing punctuation from each
    .filter(s => s.length > 1);
}

const LANG_NOTES = {
  bsk: 'Burushaski is a language isolate of Hunza-Nagar, Gilgit-Baltistan. It has 4 noun classes (hm, hf, x, y) and complex verb morphology. Pronouns: I=je, you=un, he/she=im, we=mi. Copula: is/are (animate)=yini, is/are (location/origin)=yimi. Question words: what=i, where=mini, who=inai, how=man. Verbs: go=yen, come=yas, eat=bats, drink=phuy, say=gus, know=bim. Negative prefix: baa- or b-. Sentence order is SOV. Core vocabulary: water=sil, fire=jun, house=ha, name=ming, your=uny, my=e, good=jan.',
  scl: 'Shina is a Dardic Indo-Aryan language of Gilgit-Baltistan.',
  hno: 'Hindko is spoken in Hazara and Peshawar Valley, closely related to Punjabi. Write in Nastaliq.',
  mvy: 'Indus Kohistani is a critically endangered Dardic language of Kohistan, KPK.',
  khw: 'Khowar (Chitrali) is a Dardic language of Chitral district, KPK.',
  bft: 'Balti is a Tibetic language of Baltistan with archaic Tibetan features.',
  wbl: 'Wakhi is an Eastern Iranian language of Gojal (upper Hunza).',
  trw: 'Torwali is a Dardic language of Swat Kohistan.',
  kls: 'Kalasha has no standardized script — always use Latin transliteration.',
  ps: 'Pashto is an Eastern Iranian language. Write in Pashto Nastaliq script (RTL).',
  ur: 'Urdu is the national language of Pakistan, written in Nastaliq script (RTL). It shares vocabulary with Persian, Arabic, and Hindi.',
};

router.post('/', async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  if (!text || !sourceLang || !targetLang) {
    return res.status(400).json({ error: 'text, sourceLang, and targetLang are required' });
  }
  if (!text.trim()) return res.json({ translation: '', transliteration: '', source: 'none' });

  const cacheKey = `${sourceLang}|${targetLang}|${text.trim()}`;

  // PRIORITY 0: Lexicon exact match — native-speaker verified, highest confidence
  const lexResult = lexicon.getContext(text.trim(), sourceLang, targetLang);
  if (lexResult?.isExact) {
    const targetName0 = LANGUAGE_NAMES[targetLang] || targetLang;
    let payload = { translation: lexResult.translation, transliteration: lexResult.roman || lexResult.translation, source: 'verified', lowResource: LOW_RESOURCE.has(targetLang) };
    payload = await withNastaliq(payload, targetLang, targetName0, cacheKey);
    cache.set(cacheKey, payload);
    return res.json(payload);
  }

  const wordCoverage = lexResult?.coverage || 0;
  const wordHitsList = lexResult?.hits  || [];

  // PRIORITY 1: Community corrections (override anything below)
  const userCorrection = corrections.getByKey(cacheKey);
  if (userCorrection) return res.json(userCorrection);

  const cached = cache.get(cacheKey);
  if (cached) {
    const targetName1 = LANGUAGE_NAMES[targetLang] || targetLang;
    let cachedPayload = { ...cached, source: 'ai_cached' };
    cachedPayload = await withNastaliq(cachedPayload, targetLang, targetName1, cacheKey);
    return res.json(cachedPayload);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured', source: 'none' });

  const sourceName = LANGUAGE_NAMES[sourceLang] || sourceLang;
  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;
  const isLowResource = LOW_RESOURCE.has(targetLang);

  // PRIORITY 2b: Compound-sentence DB lookup
  // When input has multiple sentences separated by punctuation (e.g. "where are you?How are you?"),
  // try each sentence independently in both lexicon and corrections.
  // Punctuation is treated as a separator, not content — humans type compound queries
  // without correct spacing all the time. If all parts resolve, combine without Gemini.
  {
    const sentences = splitSentences(text.trim());
    if (sentences.length > 1) {
      const parts = sentences.map(s => {
        // Check corrections first (community has highest trust)
        const corrKey = `${sourceLang}|${targetLang}|${s.toLowerCase().trim()}`;
        const corr = corrections.getByKey(corrKey);
        if (corr) return { _tr: corr.translation, roman: corr.translation, source: 'correction' };
        // Fall back to lexicon
        const r = lexicon.getContext(s, sourceLang, targetLang);
        if (r?.isExact) return { _tr: r.translation, roman: r.roman || r.translation, source: 'verified' };
        return null;
      });

      if (parts.every(Boolean)) {
        const sep = NASTALIQ_LANGS.has(targetLang) ? '؟ ' : '? ';
        const combined = {
          translation:     parts.map(p => p._tr).join(sep),
          transliteration: parts.map(p => p.roman).join('? '),
          source:          parts.some(p => p.source === 'correction') ? 'correction' : 'verified',
          lowResource:     isLowResource,
        };
        const finalPayload = await withNastaliq(combined, targetLang, targetName, cacheKey);
        cache.set(cacheKey, finalPayload);
        return res.json(finalPayload);
      }
    }
  }

  // === PRIORITY 2: BSK Research Academy dictionary (exact match) ===
  const dictContext = targetLang === 'bsk' ? getDictionaryContext(text.trim(), sourceLang) : '';
  if (dictContext.startsWith('\nVERIFIED DICTIONARY ENTRY')) {
    const match = dictContext.match(/"[^"]*" = "([^"]*)"/);
    if (match) {
      const verified = match[1];
      let payload = { translation: verified, transliteration: verified, source: 'verified', lowResource: isLowResource };
      payload = await withNastaliq(payload, targetLang, targetName, cacheKey);
      cache.set(cacheKey, payload);
      return res.json(payload);
    }
  }

  // === Build RAG context for Gemini ===
  const langNote = LANG_NOTES[targetLang] || '';

  // Verified word-level hits from the lexicon
  const lexHits = lexResult?.context || '';

  // Corrections word-level hits
  const corrWordHits = corrections.getWordHits(sourceLang, targetLang, text.trim());
  const corrWordContext = corrWordHits.length
    ? `\nCOMMUNITY-VERIFIED WORDS (use these exact forms):\n` +
      corrWordHits.map(h => `"${h.word}" = "${h.translation}"`).join('\n') + '\n'
    : '';

  // Legacy wordlist + master table context (still useful for non-BSK languages)
  const masterResult  = getMasterContext(text.trim(), sourceLang, targetLang);
  const masterContext = (!masterResult?.isExact && masterResult?.context) ? masterResult.context : '';
  const wordContext   = getWordListContext(targetLang, text.trim());

  // Use composition mode when we have ANY verified anchor from our own database —
  // lexicon word hits OR community corrections. Our DB is always the primary source;
  // Gemini only fills in what the DB can't cover.
  const useComposition = isLowResource && (wordHitsList.length >= 1 || corrWordHits.length >= 1);

  // All known anchors combined (lexicon word hits + community corrections)
  const allAnchors = [
    ...wordHitsList.map(h => `"${h.word}" → "${h.roman}"`),
    ...corrWordHits.map(h => `"${h.word}" → "${h.translation}"`),
  ];

  const needsNastaliq = NASTALIQ_LANGS.has(targetLang);
  const scriptNote = needsNastaliq
    ? '"translation" MUST be in Nastaliq Arabic script (RTL). "transliteration" MUST be in Latin romanization.'
    : `"translation" in ${targetName} native script (or Latin if no standard script). "transliteration" in Latin romanization.`;

  // Summary of what we know for the composition prompt
  const knownCount  = allAnchors.length;
  const coverage100 = Math.min(Math.round(wordCoverage * 100), 100);

  const prompt = useComposition
    ? `You are a ${targetName} linguistic expert helping preserve an endangered language.

Language notes: ${langNote}

We know ${knownCount} word(s) in this sentence (${coverage100}% coverage). Use the verified anchors below as locked building blocks and fill in the rest using your knowledge of ${targetName} grammar, morphology, and word order to produce the most accurate possible translation of the full sentence.

VERIFIED WORD/PHRASE ANCHORS — use these exact forms, do not alter them:
${allAnchors.join('\n')}
${dictContext}${masterContext}${wordContext}
Sentence to translate: "${text.trim()}"

Instructions:
1. Identify the sentence structure (subject, verb, object, question type, tense).
2. Place anchored words in the correct ${targetName} positions (SOV order).
3. For any word not in the anchors, use your best linguistic knowledge of ${targetName}.
4. Produce a complete, natural-sounding sentence — not just a word list.
5. Never refuse. If uncertain, give your best attempt.
6. ${scriptNote}

Return ONLY valid JSON (no markdown): {"translation":"<native/Nastaliq script>","transliteration":"<Latin romanization>"}`

    : `You are a linguistic expert in the regional and endangered languages of Pakistan's KPK and Gilgit-Baltistan.
${langNote ? `Language context: ${langNote}\n` : ''}${isLowResource
      ? `Note: ${targetName} is a low-resource language. Use the language notes and any context provided. ` +
        `Always provide your best attempt — even a partial or uncertain translation is more useful than nothing.\n`
      : ''}${lexHits}${corrWordContext}${masterContext}${wordContext}${dictContext}
Task: Translate the following ${sourceName} text into ${targetName}.
Assess the sentence structure and meaning, then give the most accurate translation you can.
Always return your best attempt. Never return empty or refuse.
${scriptNote}
Return ONLY valid JSON (no markdown, no explanation):
{"translation":"<native/Nastaliq script>","transliteration":"<Latin romanization>"}

${sourceName} input: "${text.trim()}"`;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    console.log(`[translate] raw response for "${text}" → ${targetLang}:`, raw.slice(0, 200));

    let parsed = null;

    // Strategy 1: direct JSON parse
    try { parsed = JSON.parse(raw); } catch {}

    // Strategy 2: strip markdown code fences then parse
    if (!parsed) {
      try {
        const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
        parsed = JSON.parse(stripped);
      } catch {}
    }

    // Strategy 3: extract first {...} block (greedy to capture full object)
    if (!parsed) {
      try {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) parsed = JSON.parse(match[0]);
      } catch {}
    }

    if (parsed) {
      const rawTr   = (parsed.translation    || '').trim();
      const rawRoman = (parsed.transliteration || '').trim();

      // Gemini sometimes echoes the source text as "translation" and puts the real result in "transliteration"
      const isEcho = rawTr && rawTr.toLowerCase() === text.trim().toLowerCase();
      const tr = isEcho ? rawRoman : (rawTr || rawRoman);
      const roman = rawRoman || tr;

      // Gemini sometimes literally returns "[not found]" — treat as uncertain, not empty
      const isRefusal = !tr || tr === '[not found]' || tr.toLowerCase().includes('not found') || tr === '—';

      const finalTr    = isRefusal ? '' : tr;
      const finalRoman = isRefusal ? '' : roman;

      let payload = {
        translation:     finalTr,
        transliteration: finalRoman,
        source:          isRefusal ? 'uncertain' : (useComposition ? 'word_based' : 'ai'),
        wordCoverage:    useComposition ? Math.min(Math.round(wordCoverage * 100), 100) : undefined,
        lowResource:     isLowResource,
      };
      payload = await withNastaliq(payload, targetLang, targetName, cacheKey);
      cache.set(cacheKey, payload);
      return res.json(payload);
    }

    // Fallback: treat raw text as the translation if it doesn't look like JSON
    if (raw && !raw.includes('{')) {
      const payload = { translation: raw, transliteration: '', source: 'ai', lowResource: isLowResource };
      cache.set(cacheKey, payload);
      return res.json(payload);
    }

    console.warn(`[translate] all parse strategies failed for "${text}". Raw: ${raw.slice(0, 300)}`);

    // Last resort for Google-supported languages: try MyMemory
    if (MYMEMORY_LANGS.has(targetLang)) {
      const gt = await myMemoryTranslate(text, sourceLang, targetLang);
      if (gt) {
        const payload = { translation: gt, transliteration: '', source: 'google', lowResource: false };
        cache.set(cacheKey, payload);
        return res.json(payload);
      }
    }

    return res.json({ translation: '', transliteration: '', source: 'none' });
  } catch (err) {
    console.error('Translation error:', err.message);

    // If Gemini threw, try MyMemory for supported languages before giving up
    if (MYMEMORY_LANGS.has(targetLang)) {
      try {
        const gt = await myMemoryTranslate(text, sourceLang, targetLang);
        if (gt) {
          const payload = { translation: gt, transliteration: '', source: 'google', lowResource: false };
          cache.set(cacheKey, payload);
          return res.json(payload);
        }
      } catch {}
    }

    return res.status(500).json({ error: 'Translation failed', source: 'none' });
  }
});

// Back-translation validation
router.post('/validate', async (req, res) => {
  const { text, translation, targetLang } = req.body;
  if (!text || !translation || !targetLang) {
    return res.status(400).json({ error: 'text, translation, and targetLang are required' });
  }

  const cacheKey = `validate|${targetLang}|${translation}`;
  const cached = validateCache.get(cacheKey);
  if (cached) return res.json(cached);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI service not configured' });

  const targetName = LANGUAGE_NAMES[targetLang] || targetLang;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt =
      `You are verifying a ${targetName} translation.\n` +
      `Original English: "${text}"\n` +
      `Translation to check: "${translation}"\n\n` +
      `1. Back-translate to English.\n` +
      `2. Rate accuracy: "high", "medium", or "low".\n` +
      `Return ONLY valid JSON: {"backTranslation":"...","accuracy":"high|medium|low","notes":"one sentence"}\n` +
      `No markdown, no extra text.`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { backTranslation: '', accuracy: 'low', notes: 'Could not verify' };
    }

    validateCache.set(cacheKey, parsed);
    return res.json(parsed);
  } catch (err) {
    console.error('Validation error:', err.message);
    return res.status(500).json({ error: 'Validation failed' });
  }
});

module.exports = router;
module.exports.cache = cache; // exported so feedback route can bust stale entries
