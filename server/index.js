require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const translateRoute = require('./routes/translate');
const phrasesRoute = require('./routes/phrases');
const vocabularyRoute = require('./routes/vocabulary');
const feedbackRoute    = require('./routes/feedback');
const contributeRoute  = require('./routes/contribute');
const { LANGUAGES } = require('./data/languages');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/translate', translateRoute); // includes /api/translate/validate
app.use('/api/phrases', phrasesRoute);
app.use('/api/vocabulary', vocabularyRoute);
app.use('/api/feedback',    feedbackRoute);
app.use('/api/contribute', contributeRoute);
app.get('/api/languages', (req, res) => res.json(LANGUAGES));
app.get('/health', (req, res) => res.json({ ok: true }));

// Serve the Expo web build in production
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
