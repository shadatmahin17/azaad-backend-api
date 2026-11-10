const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const { AUDIO_DIR, COVER_DIR, ALLOWED_ORIGINS } = require('./src/config/env');

const app = express();

// Enable trust proxy for reverse proxies (Render, Cloud Run, etc.)
app.set('trust proxy', 1);

// Ensure local upload directories exist
[AUDIO_DIR, COVER_DIR].forEach((dir) => {
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Security headers with crossOriginResourcePolicy allowing media streaming
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // Avoid breaking SPA dynamic inline assets
  })
);

// Rate limiters for auth endpoints and general API
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Configure CORS
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive fallback for API client support
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  credentials: true,
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static options with 7-day browser caching for uploaded media files
const mediaStaticOptions = {
  maxAge: '7d',
  immutable: true,
  fallthrough: true,
};

// Serve uploaded media files with caching
if (AUDIO_DIR) app.use('/uploads/audio', express.static(AUDIO_DIR, mediaStaticOptions));
if (COVER_DIR) {
  app.use('/uploads/covers', express.static(COVER_DIR, mediaStaticOptions));
  app.use('/uploads/cover', express.static(COVER_DIR, mediaStaticOptions));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), mediaStaticOptions));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply rate limiting
app.use('/api/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api', apiLimiter);

// API Routes
app.use('/api/songs', require('./src/routes/songs'));
app.use('/api/playlists', require('./src/routes/playlists'));
app.use('/api', require('./src/routes/auth'));
app.use('/api', require('./src/routes/profile'));

// Determine frontend build directory (Vite outputs to /public or /frontend/dist)
const publicDir = path.join(__dirname, 'public');
const frontendDistDir = path.join(__dirname, 'frontend/dist');
const staticDir = fs.existsSync(publicDir)
  ? publicDir
  : fs.existsSync(frontendDistDir)
  ? frontendDistDir
  : null;

// Serve frontend static assets if built
if (staticDir) {
  const indexHtmlPath = path.join(staticDir, 'index.html');
  const hasIndex = fs.existsSync(indexHtmlPath);

  app.use(express.static(staticDir, { maxAge: '1h' }));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    if (hasIndex) {
      return res.sendFile(indexHtmlPath);
    }
    next();
  });
}

// 404 Handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Azaad backend running on http://0.0.0.0:${PORT}`);
});
