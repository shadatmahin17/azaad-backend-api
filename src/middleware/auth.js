const { API_KEY } = require('../config/env');
const { supabaseAdmin } = require('../config/supabase');

function ensureSupabaseReady(res) {
  if (!supabaseAdmin) {
    res.status(500).json({
      error:
        'Supabase is not configured. Set env values and install Supabase packages first.',
    });
    return false;
  }
  return true;
}

function ensureSupabaseDataReady(res) {
  if (!ensureSupabaseReady(res)) return false;
  const hasDataApi = Boolean(
    supabaseAdmin && typeof supabaseAdmin.from === 'function'
  );
  if (!hasDataApi) {
    res.status(500).json({
      error:
        'Supabase data/storage features require @supabase/supabase-js to be installed.',
    });
    return false;
  }
  return true;
}

async function requireSupabaseUser(req, res, next) {
  if (!ensureSupabaseReady(res)) return;

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.supabaseAccessToken = token;
  req.supabaseUser = data.user;
  return next();
}

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

module.exports = {
  ensureSupabaseReady,
  ensureSupabaseDataReady,
  requireSupabaseUser,
  requireApiKey,
};
