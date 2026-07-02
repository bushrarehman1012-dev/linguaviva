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

app.use('/api/translate',  translateRoute);
app.use('/api/phrases',    phrasesRoute);
app.use('/api/vocabulary', vocabularyRoute);
app.use('/api/feedback',   feedbackRoute);
app.use('/api/contribute', contributeRoute);
app.get('/api/languages',  (req, res) => res.json(LANGUAGES));
app.get('/health',         (req, res) => res.json({ ok: true, ...lexicon.getStats('bsk') }));

const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('/{*path}', (req, res) => res.sendFile(path.join(publicDir, 'index.html')));

const PORT = process.env.PORT || 3001;

async function start() {
  console.log('Connecting to Supabase and loading data...');
  await Promise.all([
    lexicon.initialize(),
    corrections.initialize(),
  ]);
  app.listen(PORT, () => console.log(`Bašh server running on port ${PORT}`));
}

start().catch(err => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});
