const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const {
  PORT,
  UPLOADS_DIR,
  AUDIO_DIR,
  COVER_DIR,
  SONGS_FILE,
  LEGACY_SONGS_FILE,
  PUBLIC_DIR,
  ALLOWED_ORIGINS,
} = require('./src/config/env');

const songRoutes = require('./src/routes/songs');
const authRoutes = require('./src/routes/auth');
const profileRoutes = require('./src/routes/profile');

const app = express();

// --- Security middleware ---

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

const corsOptions = {
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' },
});

app.use('/api/login', authLimiter);
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

app.use(express.json());

// --- Static files ---

app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(PUBLIC_DIR));

// --- Initialize directories and data file ---

[path.dirname(SONGS_FILE), UPLOADS_DIR, AUDIO_DIR, COVER_DIR, PUBLIC_DIR].forEach(
  (dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
);

if (!fs.existsSync(SONGS_FILE)) {
  if (fs.existsSync(LEGACY_SONGS_FILE)) {
    fs.copyFileSync(LEGACY_SONGS_FILE, SONGS_FILE);
  } else {
    fs.writeFileSync(SONGS_FILE, '[]', 'utf8');
  }
}

// --- API info endpoint ---

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
      profile: 'GET /api/profile-view',
    },
  });
});

// --- Routes ---

app.use('/api/songs', songRoutes);
app.use('/api', authRoutes);
app.use('/api', profileRoutes);

// --- SPA fallback for React frontend ---

app.get('*', (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  return res.status(404).json({ error: 'Not found' });
});

// --- Global error handler ---

app.use((error, req, res, _next) => {
  console.error(error);
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(500).json({ error: 'Server error' });
});

app.listen(PORT, () => {
  console.log(`Azaad backend running at http://localhost:${PORT}`);
});
