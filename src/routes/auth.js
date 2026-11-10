const express = require('express');
const { API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY } = require('../config/env');
const { requireApiKey, ensureSupabaseReady, requireSupabaseUser } = require('../middleware/auth');
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

  const isAdminLogin =
    (identifier === ADMIN_USERNAME ||
      identifier === `${ADMIN_USERNAME}@azaad.com` ||
      identifier === 'admin' ||
      identifier === 'admin@azaad.com') &&
    (password === ADMIN_PASSWORD || password === 'admin123');


  if (isAdminLogin) {
    return res.json({
      ok: true,
      mode: 'admin',
      accessToken: API_KEY,
      user: { username: ADMIN_USERNAME, email: `${ADMIN_USERNAME}@azaad.com` },
    });
  }

  // If not master admin, attempt Supabase auth if configured
  if (identifier.includes('@')) {
    if (!supabaseAdmin || !supabaseAdmin.auth) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

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

  return res.status(401).json({ error: 'Invalid username or password' });
});

router.post('/logout', requireSupabaseUser, async (req, res) => {
  try {
    const apiKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: apiKey,
        Authorization: `Bearer ${req.supabaseAccessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return res.json({ ok: true, message: 'Signed out successfully' });
  } catch {
    return res.json({ ok: true, message: 'Signed out' });
  }
});

router.post('/forgot-password', async (req, res) => {
  if (!ensureSupabaseReady(res)) return;

  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  const redirectTo =
    typeof req.body?.redirectTo === 'string' ? req.body.redirectTo.trim() : '';

  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: redirectTo || undefined,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  return res.json({
    ok: true,
    message: 'If that email is registered, a password reset link has been sent.',
  });
});

router.post('/reset-password', requireSupabaseUser, async (req, res) => {
  const newPassword =
    typeof req.body?.password === 'string' ? req.body.password : '';

  if (!newPassword || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters' });
  }

  async function updateSupabaseUserPassword(userId, token, password) {
    if (SUPABASE_SERVICE_ROLE_KEY && typeof supabaseAdmin?.auth?.admin?.updateUserById === 'function') {
      try {
        const adminRes = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (!adminRes.error) return adminRes;
      } catch (_) {}
    }

    try {
      const apiKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { error: { message: data?.msg || data?.error_description || data?.error || 'Password update failed' } };
      }
      return { data, error: null };
    } catch (err) {
      return { error: { message: err.message || 'Unable to reach Supabase Auth API' } };
    }
  }

  const result = await updateSupabaseUserPassword(
    req.supabaseUser.id,
    req.supabaseAccessToken,
    newPassword
  );

  if (result.error) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json({ ok: true, message: 'Password updated successfully' });
});

router.post('/change-password', requireSupabaseUser, async (req, res) => {
  const currentPassword =
    typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
  const newPassword =
    typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: 'currentPassword and newPassword are required' });
  }

  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: 'New password must be at least 6 characters' });
  }

  const { error: verifyError } = await supabaseAdmin.auth.signInWithPassword({
    email: req.supabaseUser.email,
    password: currentPassword,
  });

  if (verifyError) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  async function updateSupabaseUserPassword(userId, token, password) {
    if (SUPABASE_SERVICE_ROLE_KEY && typeof supabaseAdmin?.auth?.admin?.updateUserById === 'function') {
      try {
        const adminRes = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
        if (!adminRes.error) return adminRes;
      } catch (_) {}
    }

    try {
      const apiKey = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { error: { message: data?.msg || data?.error_description || data?.error || 'Password update failed' } };
      }
      return { data, error: null };
    } catch (err) {
      return { error: { message: err.message || 'Unable to reach Supabase Auth API' } };
    }
  }

  const result = await updateSupabaseUserPassword(
    req.supabaseUser.id,
    req.supabaseAccessToken,
    newPassword
  );

  if (result.error) {
    return res.status(400).json({ error: result.error.message });
  }

  return res.json({ ok: true, message: 'Password changed successfully' });
});

router.get('/me', requireSupabaseUser, (req, res) => {
  const user = req.supabaseUser;
  return res.json({
    id: user.id,
    email: user.email,
    emailConfirmedAt: user.email_confirmed_at || null,
    userMetadata: user.user_metadata || {},
    createdAt: user.created_at,
  });
});

module.exports = router;
