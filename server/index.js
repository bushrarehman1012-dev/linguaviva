require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const lexicon      = require('./data/lexicon');
const corrections  = require('./data/corrections');

const translateRoute  = require('./routes/translate');
const phrasesRoute    = require('./routes/phrases');
const vocabularyRoute = require('./routes/vocabulary');
const feedbackRoute   = require('./routes/feedback');
const contributeRoute = require('./routes/contribute');
const { LANGUAGES }   = require('./data/languages');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
let _ready  = false;
let _error  = null;

// Must be registered before static/SPA catch-all
app.get('/health', (req, res) => {
  if (_error) return res.status(503).json({ ok: false, error: _error });
  res.json({ ok: true, ready: _ready, port: PORT });
});

app.use('/api/translate',  translateRoute);
app.use('/api/phrases',    phrasesRoute);
app.use('/api/vocabulary', vocabularyRoute);
app.use('/api/feedback',   feedbackRoute);
app.use('/api/contribute', contributeRoute);
app.get('/api/languages',  (req, res) => res.json(LANGUAGES));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('/{*path}', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

async function start() {
  // Start HTTP server first so Railway health check never times out
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    console.log(`SUPABASE_URL set: ${!!process.env.SUPABASE_URL}`);
    console.log(`SUPABASE_SERVICE_KEY set: ${!!process.env.SUPABASE_SERVICE_KEY}`);
  });

  try {
    console.log('Connecting to Supabase...');
    await Promise.all([lexicon.initialize(), corrections.initialize()]);
    _ready = true;
    console.log('Supabase ready — all data loaded');
  } catch (err) {
    _error = err.message;
    console.error('Supabase init error:', err.message);
  }
}

start();
