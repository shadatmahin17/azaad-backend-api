const fs = require('fs');
const path = require('path');

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

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const defaultEnvPath = path.join(ROOT_DIR, '.env');
const exampleEnvPath = path.join(ROOT_DIR, '.env.example');

if (fs.existsSync(defaultEnvPath)) {
  loadEnvFile(defaultEnvPath);
} else if (fs.existsSync(exampleEnvPath)) {
  loadEnvFile(exampleEnvPath);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

const PORT = process.env.PORT || 5000;
const API_KEY = requireEnv('ADMIN_API_KEY');
const ADMIN_USERNAME = requireEnv('ADMIN_USERNAME');
const ADMIN_PASSWORD = requireEnv('ADMIN_PASSWORD');

const CATEGORY_OPTIONS = ['Hindi', 'Bangla', 'English', 'Nasheed', 'Sura', 'Other'];

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const COVER_DIR = path.join(UPLOADS_DIR, 'covers');
const SONGS_FILE = process.env.SONGS_FILE
  ? path.resolve(process.env.SONGS_FILE)
  : DATA_DIR
    ? path.join(DATA_DIR, 'songs.json')
    : path.join(ROOT_DIR, 'songs.json');
const LEGACY_SONGS_FILE = path.join(ROOT_DIR, 'data', 'songs.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';
const USE_SUPABASE = Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_PUBLISHABLE_KEY));

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

module.exports = {
  ROOT_DIR,
  PORT,
  API_KEY,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  CATEGORY_OPTIONS,
  DATA_DIR,
  UPLOADS_DIR,
  AUDIO_DIR,
  COVER_DIR,
  SONGS_FILE,
  LEGACY_SONGS_FILE,
  PUBLIC_DIR,
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_STORAGE_BUCKET,
  USE_SUPABASE,
  ALLOWED_ORIGINS,
};
