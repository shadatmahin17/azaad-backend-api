const express = require('express');
const { API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD } = require('../config/env');
const { requireApiKey, ensureSupabaseReady } = require('../middleware/auth');
const { supabaseAdmin } = require('../config/supabase');

const router = express.Router();

router.get('/auth-check', requireApiKey, (req, res) => {
  res.json({ ok: true });
});

router.post('/login', async (req, res) => {
  const username =
    typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
  const password =
    typeof req.body?.password === 'string' ? req.body.password : '';
  const identifier = email || username;

  if (!identifier || !password) {
    return res
      .status(400)
      .json({ error: 'username/email and password are required' });
  }

  if (identifier.includes('@')) {
    if (!ensureSupabaseReady(res)) return;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (!error && data?.session) {
      return res.json({
        ok: true,
        mode: 'supabase',
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user: data.user,
      });
    }
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  return res.json({
    ok: true,
    user: { username: ADMIN_USERNAME },
  });
});

module.exports = router;
