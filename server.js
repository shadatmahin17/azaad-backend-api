const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const { AUDIO_DIR, COVER_DIR } = require('./src/config/env');

const app = express();

// Required for Render reverse proxy & express-rate-limit
app.set('trust proxy', 1);

// Resolve directories to absolute paths to prevent CWD mismatches
const resolvedAudioDir = AUDIO_DIR ? path.resolve(AUDIO_DIR) : null;
const resolvedCoverDir = COVER_DIR ? path.resolve(COVER_DIR) : null;

[resolvedAudioDir, resolvedCoverDir].forEach((dir) => {
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded media files
if (resolvedAudioDir) app.use('/uploads/audio', express.static(resolvedAudioDir));
if (resolvedCoverDir) app.use('/uploads/cover', express.static(resolvedCoverDir));

// Health Check (Render monitoring)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/songs', require('./src/routes/songs'));
app.use('/api/playlists', require('./src/routes/playlists'));
app.use('/api', require('./src/routes/auth'));
app.use('/api', require('./src/routes/profile'));

// Optional: Serve built frontend if running unified monolithic service
const frontendDist = path.join(__dirname, 'frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 handler for API routes
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Azaad backend running on 0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated gracefully');
  });
});
// Add this in server.js
app.get('/', (req, res) => {
  res.json({
    message: 'Azaad Backend API is running',
    endpoints: {
      health: '/health',
      songs: '/api/songs',
      playlists: '/api/playlists',
    },
  });
});
// Serve Frontend static assets in production
const frontendDist = path.join(__dirname, 'frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));

  // SPA fallback for all non-API routes
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/uploads') ||
      req.path.startsWith('/health')
    ) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}
