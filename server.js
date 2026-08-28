const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const { AUDIO_DIR, COVER_DIR } = require('./src/config/env');

const app = express();

// Required for Render reverse proxy & express-rate-limit
app.set('trust proxy', 1);

// Ensure upload directories exist
[AUDIO_DIR, COVER_DIR].forEach((dir) => {
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
if (AUDIO_DIR) app.use('/uploads/audio', express.static(AUDIO_DIR));
if (COVER_DIR) app.use('/uploads/cover', express.static(COVER_DIR));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount Routes
app.use('/api/songs', require('./src/routes/songs'));
app.use('/api/playlists', require('./src/routes/playlists'));
app.use('/api', require('./src/routes/auth'));
app.use('/api', require('./src/routes/profile'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

const PORT = parseInt(process.env.PORT, 10) || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Azaad backend running on 0.0.0.0:${PORT}`);
});
