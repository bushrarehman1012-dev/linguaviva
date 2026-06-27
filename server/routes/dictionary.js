const express = require('express');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const DICT_DIR = path.join(__dirname, '..', 'data', 'dictionaries');

router.get('/download/:langCode', (req, res) => {
  const { langCode } = req.params;
  const allowed = ['ps', 'bsk', 'scl', 'hno', 'mvy'];

  if (!allowed.includes(langCode)) {
    return res.status(404).json({ error: 'Language not found' });
  }

  const filePath = path.join(DICT_DIR, `${langCode}-en.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Dictionary file not found' });
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Failed to read dictionary' });
  }
});

module.exports = router;
