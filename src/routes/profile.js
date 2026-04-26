const express = require('express');
const path = require('path');
const {
  requireSupabaseUser,
  ensureSupabaseDataReady,
} = require('../middleware/auth');
const { avatarUpload } = require('../middleware/upload');
const { supabaseAdmin, hasSupabaseStorageApi } = require('../config/supabase');
const { SUPABASE_STORAGE_BUCKET } = require('../config/env');

const router = express.Router();

router.post('/auth/signup', async (req, res) => {
  if (!ensureSupabaseDataReady(res)) return;

  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
  const password =
    typeof req.body?.password === 'string' ? req.body.password : '';
  const fullName =
    typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'email and password are required' });
  }

  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
      },
    },
  });

  if (error) return res.status(400).json({ error: error.message });

  if (data?.user) {
    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName || null,
    });
  }

  return res.status(201).json({
    message:
      'Signup successful. Check your email if confirmation is enabled.',
    user: data.user,
    session: data.session,
  });
});

router.post('/auth/signin', async (req, res) => {
  const { ensureSupabaseReady } = require('../middleware/auth');
  if (!ensureSupabaseReady(res)) return;

  const email =
    typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
  const password =
    typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res
      .status(400)
      .json({ error: 'email and password are required' });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data?.session) {
    return res
      .status(401)
      .json({ error: error?.message || 'Invalid login credentials' });
  }

  return res.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user,
    expiresAt: data.session.expires_at,
  });
});

router.get(
  '/profile-view',
  requireSupabaseUser,
  async (req, res) => {
    if (!ensureSupabaseDataReady(res)) return;
    const user = req.supabaseUser;
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    return res.json({
      id: user.id,
      email: user.email,
      profile: {
        full_name:
          profile?.full_name || user.user_metadata?.full_name || '',
        avatar_url: profile?.avatar_url || null,
        bio: profile?.bio || '',
      },
    });
  }
);

router.put(
  '/profile',
  requireSupabaseUser,
  async (req, res) => {
    if (!ensureSupabaseDataReady(res)) return;
    const user = req.supabaseUser;
    const fullName =
      typeof req.body?.fullName === 'string'
        ? req.body.fullName.trim()
        : null;
    const bio =
      typeof req.body?.bio === 'string' ? req.body.bio.trim() : null;

    const payload = {
      id: user.id,
      email: user.email,
      full_name: fullName,
      bio,
    };

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(payload)
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json(data);
  }
);

router.post(
  '/profile/avatar',
  requireSupabaseUser,
  avatarUpload.single('avatar'),
  async (req, res) => {
    if (!ensureSupabaseDataReady(res)) return;
    if (!hasSupabaseStorageApi) {
      return res.status(500).json({
        error:
          'Supabase storage features require @supabase/supabase-js to be installed.',
      });
    }
    if (!req.file)
      return res.status(400).json({ error: 'avatar file is required' });

    const user = req.supabaseUser;
    const ext =
      path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
    const objectPath = `${user.id}/${Date.now()}${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .upload(objectPath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError)
      return res.status(400).json({ error: uploadError.message });

    const { data: publicData } = supabaseAdmin.storage
      .from(SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(objectPath);

    const avatarUrl = publicData?.publicUrl || null;
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email,
        avatar_url: avatarUrl,
      })
      .select('*')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ avatarUrl, profile: data });
  }
);

module.exports = router;
