const crypto = require('crypto');
const { API_KEY } = require('../config/env');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Safely compares two strings using constant-time comparison to prevent timing attacks.
 */
function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extracts a Bearer token from the Authorization header (case-insensitive).
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization || '';
  if (typeof authHeader !== 'string') return '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match && match ? match.trim() : '';
}

function ensureSupabaseReady(res) {
  if (!supabaseAdmin || !supabaseAdmin.auth) {
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

/**
 * Validates the Supabase Bearer token and attaches user information to req.
 */
async function authenticateSupabaseToken(token, req, res) {
  if (!ensureSupabaseReady(res)) return false;

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return false;
    }

    req.supabaseAccessToken = token;
    req.supabaseUser = data.user;
    return true;
  } catch (err) {
    res.status(401).json({ error: 'Authentication failed' });
    return false;
  }
}

async function requireSupabaseUser(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token' });
  }

  if (API_KEY && typeof API_KEY === 'string' && safeCompare(token, API_KEY)) {
    req.supabaseAccessToken = token;
    req.supabaseUser = {
      id: 'admin',
      email: 'admin@azaad.com',
      user_metadata: { full_name: 'Admin' },
      created_at: new Date().toISOString(),
    };
    return next();
  }

  const isAuthenticated = await authenticateSupabaseToken(token, req, res);
  if (isAuthenticated) {
    return next();
  }
}

function requireApiKey(req, res, next) {
  if (!API_KEY || typeof API_KEY !== 'string' || API_KEY.trim() === '') {
    return res.status(500).json({ error: 'API key is not configured on the server' });
  }

  const clientKey = req.headers['x-api-key'];
  if (!clientKey || !safeCompare(clientKey, API_KEY)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
}

async function requireAuth(req, res, next) {
  const clientKey = req.headers['x-api-key'];

  if (API_KEY && typeof API_KEY === 'string' && API_KEY.trim() !== '') {
    if (clientKey && safeCompare(clientKey, API_KEY)) {
      return next();
    }
  }

  const token = extractBearerToken(req);
  if (token && API_KEY && typeof API_KEY === 'string' && safeCompare(token, API_KEY)) {
    req.supabaseAccessToken = token;
    req.supabaseUser = {
      id: 'admin',
      email: 'admin@azaad.com',
      user_metadata: { full_name: 'Admin' },
      created_at: new Date().toISOString(),
    };
    return next();
  }

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized – provide a valid x-api-key or Bearer token',
    });
  }

  const isAuthenticated = await authenticateSupabaseToken(token, req, res);
  if (isAuthenticated) {
    return next();
  }
}

module.exports = {
  ensureSupabaseReady,
  ensureSupabaseDataReady,
  requireSupabaseUser,
  requireApiKey,
  requireAuth,
};
