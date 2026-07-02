const { createClient } = require('@supabase/supabase-js');

// Lazy client — created on first use so a missing env var never crashes the process at startup.
let _client = null;

function getClient() {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY. Add them to Railway Variables.'
      );
    }
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

// Proxy so callers can still do `supabase.from(...)` without changing any code.
module.exports = new Proxy({}, {
  get(_, prop) {
    return getClient()[prop];
  }
});
