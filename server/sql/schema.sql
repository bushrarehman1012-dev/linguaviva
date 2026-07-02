-- ============================================================
--  Bašh — Supabase schema
--  Run this once in the Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ============================================================

-- ── Core word/phrase inventory ────────────────────────────
CREATE TABLE IF NOT EXISTS lexicon_entries (
  id             TEXT        PRIMARY KEY,           -- slug: "water", "good_morning"
  type           TEXT        NOT NULL DEFAULT 'word', -- 'word' | 'phrase'
  pos            TEXT,                              -- noun, verb, adjective …
  category       TEXT,                              -- food, travel, family …
  canonical_en   TEXT        NOT NULL,
  frequency_rank INTEGER,                           -- 1 = most common; drives contribute queue order
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── One translation row per (entry, language) ─────────────
CREATE TABLE IF NOT EXISTS translations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id   TEXT        NOT NULL REFERENCES lexicon_entries(id) ON DELETE CASCADE,
  lang_code  TEXT        NOT NULL,
  text       TEXT        NOT NULL,
  roman      TEXT,                                  -- Latin transliteration
  verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  confidence TEXT        NOT NULL DEFAULT 'medium', -- 'high' | 'medium' | 'community'
  source     TEXT        NOT NULL DEFAULT 'baseline',
  -- 'baseline' | 'community_native' | 'community_consensus' | 'admin_verified'
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entry_id, lang_code)
);

-- ── Append-only community submission log ──────────────────
-- Never delete rows — this is the primary source for AI training provenance.
CREATE TABLE IF NOT EXISTS contributions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id        TEXT        NOT NULL REFERENCES lexicon_entries(id),
  lang_code       TEXT        NOT NULL,
  text            TEXT        NOT NULL,
  roman           TEXT,
  notes           TEXT,
  contributor_tag TEXT        NOT NULL DEFAULT 'anonymous',
  status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending' | 'promoted' | 'rejected'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User corrections to AI translations ───────────────────
CREATE TABLE IF NOT EXISTS corrections (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lang           TEXT        NOT NULL,
  target_lang           TEXT        NOT NULL,
  original_text         TEXT        NOT NULL,
  corrected_translation TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(source_lang, target_lang, original_text)
);

-- ── Raw feedback log (good/bad verdicts from the translate UI) ──
CREATE TABLE IF NOT EXISTS feedback (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  source_lang   TEXT        NOT NULL,
  target_lang   TEXT        NOT NULL,
  original_text TEXT        NOT NULL,
  translation   TEXT        NOT NULL,
  verdict       TEXT        NOT NULL, -- 'good' | 'bad'
  correction    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_translations_entry    ON translations(entry_id);
CREATE INDEX IF NOT EXISTS idx_translations_lang     ON translations(lang_code);
CREATE INDEX IF NOT EXISTS idx_translations_text     ON translations(lower(text), lang_code);
CREATE INDEX IF NOT EXISTS idx_contributions_entry   ON contributions(entry_id, lang_code);
CREATE INDEX IF NOT EXISTS idx_contributions_status  ON contributions(status);
CREATE INDEX IF NOT EXISTS idx_corrections_lookup    ON corrections(source_lang, target_lang, original_text);
CREATE INDEX IF NOT EXISTS idx_lexicon_rank          ON lexicon_entries(frequency_rank);
CREATE INDEX IF NOT EXISTS idx_lexicon_category      ON lexicon_entries(category);

-- ── Auto-update updated_at ────────────────────────────────
CREATE OR REPLACE FUNCTION _update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE OR REPLACE TRIGGER tg_lexicon_updated
  BEFORE UPDATE ON lexicon_entries
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

CREATE OR REPLACE TRIGGER tg_translations_updated
  BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

CREATE OR REPLACE TRIGGER tg_corrections_updated
  BEFORE UPDATE ON corrections
  FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

-- ── Row-level security (service key bypasses all policies) ──
ALTER TABLE lexicon_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE translations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE corrections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback         ENABLE ROW LEVEL SECURITY;

-- Public read-only for lexicon data (anon key can read, not write)
CREATE POLICY "public read lexicon"       ON lexicon_entries  FOR SELECT USING (true);
CREATE POLICY "public read translations"  ON translations      FOR SELECT USING (true);

-- ── Training data view (handy export) ────────────────────
-- Usage: SELECT * FROM training_pairs WHERE lang_code = 'bsk';
CREATE OR REPLACE VIEW training_pairs AS
SELECT
  e.id          AS entry_id,
  e.canonical_en,
  e.type,
  e.pos,
  e.category,
  e.frequency_rank,
  t.lang_code,
  t.text        AS translation,
  t.roman,
  t.verified,
  t.confidence,
  t.source,
  t.updated_at
FROM lexicon_entries e
JOIN translations t ON t.entry_id = e.id
WHERE t.lang_code <> 'en';
