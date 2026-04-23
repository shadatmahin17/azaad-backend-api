const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const supabaseModulePath = path.join(__dirname, 'node_modules', '@supabase', 'supabase-js');

const createSupabaseClient = fs.existsSync(supabaseModulePath)
  ? require('@supabase/supabase-js').createClient
  : null;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separator = trimmed.indexOf('=');
    if (separator < 1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

const defaultEnvPath = path.join(__dirname, '.env');
const exampleEnvPath = path.join(__dirname, '.env.example');
if (fs.existsSync(defaultEnvPath)) {
  loadEnvFile(defaultEnvPath);
} else if (fs.existsSync(exampleEnvPath)) {
  loadEnvFile(exampleEnvPath);
}

function createSupabaseAuthFallback(url, apiKey) {
  const authHeaders = (token) => ({
    apikey: apiKey,
    Authorization: `Bearer ${token || apiKey}`,
    'Content-Type': 'application/json'
  });

  const parseResponse = async (response) => {
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { data: null, error: { message: payload?.msg || payload?.error_description || payload?.error || 'Supabase request failed' } };
    }
    return { data: payload, error: null };
  };

  return {
    auth: {
      async signInWithPassword({ email, password }) {
        try {
          const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ email, password })
          });
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return { data: { user: data.user, session: data }, error: null };
        } catch (error) {
          return { data: null, error: { message: error.message || 'Unable to reach Supabase Auth API' } };
        }
      },
      async signUp({ email, password, options }) {
        try {
          const response = await fetch(`${url}/auth/v1/signup`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              email,
              password,
              data: options?.data || {}
            })
          });
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return { data: { user: data.user, session: data }, error: null };
        } catch (error) {
          return { data: null, error: { message: error.message || 'Unable to reach Supabase Auth API' } };
        }
      },
      async getUser(token) {
        try {
          const response = await fetch(`${url}/auth/v1/user`, {
            method: 'GET',
            headers: authHeaders(token)
          });
          const { data, error } = await parseResponse(response);
          if (error) return { data: null, error };
          return { data: { user: data }, error: null };
        } catch (error) {
          return { data: null, error: { message: error.message || 'Unable to reach Supabase Auth API' } };
        }
      }
    },
    storage: null
  };
}

const app = express();
const PORT = process.env.PORT || 5000;
const API_KEY = process.env.ADMIN_API_KEY || '163087';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'mahin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'mahin@2026*';
const CATEGORY_OPTIONS = ['Hindi', 'Bangla', 'English', 'Nasheed', 'Sura', 'Other'];

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const COVER_DIR = path.join(UPLOADS_DIR, 'covers');
const SONGS_FILE = process.env.SONGS_FILE
  ? path.resolve(process.env.SONGS_FILE)
  : DATA_DIR
    ? path.join(DATA_DIR, 'songs.json')
    : path.join(__dirname, 'songs.json');
const LEGACY_SONGS_FILE = path.join(__dirname, 'data', 'songs.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';
const USE_SUPABASE = Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY));
const SUPABASE_API_KEY = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY;

const supabaseAdmin = USE_SUPABASE
  ? createSupabaseClient
    ? createSupabaseClient(SUPABASE_URL, SUPABASE_API_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    : createSupabaseAuthFallback(SUPABASE_URL, SUPABASE_API_KEY)
  : null;

const hasSupabaseDataApi = Boolean(supabaseAdmin && typeof supabaseAdmin.from === 'function');
const hasSupabaseStorageApi = Boolean(supabaseAdmin?.storage && typeof supabaseAdmin.storage.from === 'function');

[path.dirname(SONGS_FILE), UPLOADS_DIR, AUDIO_DIR, COVER_DIR, PUBLIC_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(SONGS_FILE)) {
  if (fs.existsSync(LEGACY_SONGS_FILE)) {
    fs.copyFileSync(LEGACY_SONGS_FILE, SONGS_FILE);
  } else {
    fs.writeFileSync(SONGS_FILE, '[]', 'utf8');
  }
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

function ensureSupabaseReady(res) {
  if (!supabaseAdmin) {
    res.status(500).json({ error: 'Supabase is not configured. Set env values and install Supabase packages first.' });
    return false;
  }
  return true;
}

function ensureSupabaseDataReady(res) {
  if (!ensureSupabaseReady(res)) return false;
  if (!hasSupabaseDataApi) {
    res.status(500).json({ error: 'Supabase data/storage features require @supabase/supabase-js to be installed.' });
    return false;
  }
  return true;
}

async function requireSupabaseUser(req, res, next) {
  if (!ensureSupabaseReady(res)) return;

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

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

function readSongs() {
  try {
    const raw = fs.readFileSync(SONGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function writeSongs(songs) {
  fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2), 'utf8');
}

function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (key !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

function isHttpUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function isS3Url(value) {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^s3:\/\/[^/]+\/.+/i.test(trimmed);
}

function isAllowedMediaUrl(value) {
  return isHttpUrl(value) || isS3Url(value);
}

function normalizeS3Url(value) {
  if (!isS3Url(value)) return value;
  const trimmed = value.trim();
  const withoutProtocol = trimmed.slice(5);
  const slashIndex = withoutProtocol.indexOf('/');
  if (slashIndex === -1) return value;

  const bucket = withoutProtocol.slice(0, slashIndex).trim();
  const key = withoutProtocol.slice(slashIndex + 1).trim();
  if (!bucket || !key) return value;

  const region = (process.env.AWS_REGION || process.env.S3_REGION || '').trim();
  const encodedKey = encodeURI(key);
  if (region) {
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodedKey}`;
  }
  return `https://${bucket}.s3.amazonaws.com/${encodedKey}`;
}

function normalizeMediaUrl(value) {
  if (!value || typeof value !== 'string') return value;
  if (isS3Url(value)) return normalizeS3Url(value);
  return value.trim();
}

function normalizeCategory(value) {
  const raw = String(value || '').trim().toLowerCase();
  const match = CATEGORY_OPTIONS.find((item) => item.toLowerCase() === raw);
  return match || 'Other';
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'audio') return cb(null, AUDIO_DIR);
    if (file.fieldname === 'cover') return cb(null, COVER_DIR);
    return cb(new Error('Invalid upload field'));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '-');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: {
    files: 2,
    fileSize: 100 * 1024 * 1024
  }
});

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: 5 * 1024 * 1024 }
});

app.get('/api', (req, res) => {
  res.json({
    ok: true,
    message: 'Azaad backend running',
    endpoints: {
      list: 'GET /api/songs',
      create: 'POST /api/songs',
      update: 'PUT /api/songs/:id',
      delete: 'DELETE /api/songs/:id',
      signup: 'POST /api/auth/signup',
      signin: 'POST /api/auth/signin',
      profile: 'GET /api/profile-view'
    }
  });
});

app.post('/api/auth/signup', async (req, res) => {
  if (!ensureSupabaseDataReady(res)) return;

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabaseAdmin.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null
      }
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  if (data?.user) {
    await supabaseAdmin.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email,
      full_name: fullName || null
    });
  }

  return res.status(201).json({
    message: 'Signup successful. Check your email if confirmation is enabled.',
    user: data.user,
    session: data.session
  });
});

app.post('/api/auth/signin', async (req, res) => {
  if (!ensureSupabaseReady(res)) return;

  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const { data, error } = await supabaseAdmin.auth.signInWithPassword({ email, password });
  if (error || !data?.session) {
    return res.status(401).json({ error: error?.message || 'Invalid login credentials' });
  }

  return res.json({
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: data.user,
    expiresAt: data.session.expires_at
  });
});

app.get('/api/profile-view', requireSupabaseUser, async (req, res) => {
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
      full_name: profile?.full_name || user.user_metadata?.full_name || '',
      avatar_url: profile?.avatar_url || null,
      bio: profile?.bio || ''
    }
  });
});

app.put('/api/profile', requireSupabaseUser, async (req, res) => {
  if (!ensureSupabaseDataReady(res)) return;
  const user = req.supabaseUser;
  const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : null;
  const bio = typeof req.body?.bio === 'string' ? req.body.bio.trim() : null;

  const payload = {
    id: user.id,
    email: user.email,
    full_name: fullName,
    bio
  };

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(payload)
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  return res.json(data);
});

app.post('/api/profile/avatar', requireSupabaseUser, avatarUpload.single('avatar'), async (req, res) => {
  if (!ensureSupabaseDataReady(res)) return;
  if (!hasSupabaseStorageApi) {
    return res.status(500).json({ error: 'Supabase storage features require @supabase/supabase-js to be installed.' });
  }
  if (!req.file) return res.status(400).json({ error: 'avatar file is required' });

  const user = req.supabaseUser;
  const ext = path.extname(req.file.originalname || '').toLowerCase() || '.jpg';
  const objectPath = `${user.id}/${Date.now()}${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .upload(objectPath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true
    });

  if (uploadError) return res.status(400).json({ error: uploadError.message });

  const { data: publicData } = supabaseAdmin.storage
    .from(SUPABASE_STORAGE_BUCKET)
    .getPublicUrl(objectPath);

  const avatarUrl = publicData?.publicUrl || null;
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert({ id: user.id, email: user.email, avatar_url: avatarUrl })
    .select('*')
    .single();

  if (error) return res.status(400).json({ error: error.message });

  return res.json({ avatarUrl, profile: data });
});

app.get('/api/songs', (req, res) => {
  const songs = readSongs();
  const normalizedSongs = songs.map((song) => ({
    ...song,
    coverUrl: normalizeMediaUrl(song.coverUrl),
    audioUrl: normalizeMediaUrl(song.audioUrl)
  }));
  res.json(normalizedSongs);
});

app.get('/api/auth-check', requireApiKey, (req, res) => {
  res.json({ ok: true });
});

app.post('/api/login', async (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const identifier = email || username;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'username/email and password are required' });
  }

  if (identifier.includes('@')) {
    if (!ensureSupabaseReady(res)) return;

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email: identifier,
      password
    });

    if (!error && data?.session) {
      return res.json({
        ok: true,
        mode: 'supabase',
        apiKey: API_KEY,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at,
        user: data.user
      });
    }
  }

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  return res.json({
    ok: true,
    apiKey: API_KEY,
    user: { username: ADMIN_USERNAME }
  });
});

app.post(
  '/api/songs',
  requireApiKey,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 }
  ]),
  (req, res) => {
    try {
      const songs = readSongs();

      const { title, artist, category, featured, trending, audioUrl, coverUrl, genre, singers, type, vibe } = req.body;
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];
      const sanitizedAudioUrl = audioUrl ? String(audioUrl).trim() : '';
      const sanitizedCoverUrl = coverUrl ? String(coverUrl).trim() : '';
      const hasAudioSource = Boolean(audioFile) || Boolean(sanitizedAudioUrl);
      const hasCoverSource = Boolean(coverFile) || Boolean(sanitizedCoverUrl);

      if (!title || !artist || !hasAudioSource || !hasCoverSource) {
        return res.status(400).json({
          error: 'title, artist, plus audio and cover (file or URL) are required'
        });
      }

      if (sanitizedAudioUrl && !isAllowedMediaUrl(sanitizedAudioUrl)) {
        return res.status(400).json({ error: 'audioUrl must be a valid http(s) or s3:// URL' });
      }

      if (sanitizedCoverUrl && !isAllowedMediaUrl(sanitizedCoverUrl)) {
        return res.status(400).json({ error: 'coverUrl must be a valid http(s) or s3:// URL' });
      }

      const newSong = {
        id: Date.now().toString(),
        title: String(title).trim(),
        artist: String(artist).trim(),
        category: normalizeCategory(category),
        genre: genre ? String(genre).trim() : '',
        singers: singers ? String(singers).trim() : String(artist).trim(),
        type: type ? String(type).trim() : '',
        vibe: vibe ? String(vibe).trim() : '',
        featured: featured === 'true' || featured === true,
        trending: trending === 'true' || trending === true,
        coverUrl: coverFile ? `/uploads/covers/${coverFile.filename}` : normalizeMediaUrl(sanitizedCoverUrl),
        audioUrl: audioFile ? `/uploads/audio/${audioFile.filename}` : normalizeMediaUrl(sanitizedAudioUrl),
        createdAt: new Date().toISOString()
      };

      songs.unshift(newSong);
      writeSongs(songs);

      return res.status(201).json(newSong);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }
);

app.delete('/api/songs/:id', requireApiKey, (req, res) => {
  try {
    const songs = readSongs();
    const index = songs.findIndex((song) => song.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const removed = songs[index];
    songs.splice(index, 1);

    const removeIfExists = (relativeUrl) => {
      if (!relativeUrl || typeof relativeUrl !== 'string') return;
      const relativePath = relativeUrl.replace(/^\//, '');
      const fullPath = path.join(__dirname, relativePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    };

    removeIfExists(removed.coverUrl);
    removeIfExists(removed.audioUrl);

    writeSongs(songs);
    return res.json({ success: true, removed });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

app.put('/api/songs/:id', requireApiKey, (req, res) => {
  try {
    const songs = readSongs();
    const index = songs.findIndex((song) => song.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const currentSong = songs[index];
    const title = typeof req.body.title === 'string' ? req.body.title.trim() : currentSong.title;
    const artist = typeof req.body.artist === 'string' ? req.body.artist.trim() : currentSong.artist;
    const category = typeof req.body.category === 'string' ? normalizeCategory(req.body.category) : (currentSong.category || 'Other');
    const genre = typeof req.body.genre === 'string' ? req.body.genre.trim() : (currentSong.genre || '');
    const singers = typeof req.body.singers === 'string' ? req.body.singers.trim() : (currentSong.singers || currentSong.artist);
    const type = typeof req.body.type === 'string' ? req.body.type.trim() : (currentSong.type || '');
    const vibe = typeof req.body.vibe === 'string' ? req.body.vibe.trim() : (currentSong.vibe || '');
    const featured = typeof req.body.featured === 'boolean' ? req.body.featured : currentSong.featured;
    const trending = typeof req.body.trending === 'boolean' ? req.body.trending : currentSong.trending;
    const coverUrl = typeof req.body.coverUrl === 'string' ? req.body.coverUrl.trim() : currentSong.coverUrl;
    const audioUrl = typeof req.body.audioUrl === 'string' ? req.body.audioUrl.trim() : currentSong.audioUrl;

    if (!title || !artist) {
      return res.status(400).json({ error: 'title and artist are required' });
    }

    if (audioUrl && !audioUrl.startsWith('/uploads/') && !isAllowedMediaUrl(audioUrl)) {
      return res.status(400).json({ error: 'audioUrl must be a valid http(s), s3:// URL, or local upload path' });
    }

    if (coverUrl && !coverUrl.startsWith('/uploads/') && !isAllowedMediaUrl(coverUrl)) {
      return res.status(400).json({ error: 'coverUrl must be a valid http(s), s3:// URL, or local upload path' });
    }

    const updatedSong = {
      ...currentSong,
      title,
      artist,
      category: category || 'Other',
      genre,
      singers,
      type,
      vibe,
      featured,
      trending,
      coverUrl: coverUrl ? normalizeMediaUrl(coverUrl) : currentSong.coverUrl,
      audioUrl: audioUrl ? normalizeMediaUrl(audioUrl) : currentSong.audioUrl
    };

    songs[index] = updatedSong;
    writeSongs(songs);
    return res.json(updatedSong);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Update failed' });
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Azaad backend running at http://localhost:${PORT}`);
});
