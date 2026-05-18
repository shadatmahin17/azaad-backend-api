const express = require('express');
const { API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD, SUPABASE_URL } = require('../config/env');
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

router.post('/logout', requireSupabaseUser, async (req, res) => {
  try {
    if (typeof supabaseAdmin.auth.signOut === 'function') {
      await supabaseAdmin.auth.signOut(req.supabaseAccessToken);
    } else if (typeof supabaseAdmin.auth.admin?.signOut === 'function') {
      await supabaseAdmin.auth.admin.signOut(req.supabaseUser.id);
    }
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

  let result;
  if (typeof supabaseAdmin.auth.updateUser === 'function') {
    result = await supabaseAdmin.auth.updateUser(req.supabaseAccessToken, {
      password: newPassword,
    });
  } else if (typeof supabaseAdmin.auth.admin?.updateUserById === 'function') {
    result = await supabaseAdmin.auth.admin.updateUserById(
      req.supabaseUser.id,
      { password: newPassword }
    );
  } else {
    return res
      .status(500)
      .json({ error: 'Password update is not supported by the current Supabase client' });
  }

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

  let result;
  if (typeof supabaseAdmin.auth.updateUser === 'function') {
    result = await supabaseAdmin.auth.updateUser(req.supabaseAccessToken, {
      password: newPassword,
    });
  } else if (typeof supabaseAdmin.auth.admin?.updateUserById === 'function') {
    result = await supabaseAdmin.auth.admin.updateUserById(
      req.supabaseUser.id,
      { password: newPassword }
    );
  } else {
    return res
      .status(500)
      .json({ error: 'Password update is not supported by the current Supabase client' });
  }

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
