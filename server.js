const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

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

app.get('/api', (req, res) => {
  res.json({
    ok: true,
    message: 'Azaad backend running',
    endpoints: {
      list: 'GET /api/songs',
      create: 'POST /api/songs',
      update: 'PUT /api/songs/:id',
      delete: 'DELETE /api/songs/:id'
    }
  });
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

app.post('/api/login', (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
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
