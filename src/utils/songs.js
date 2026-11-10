const fs = require('fs');
const path = require('path');
const { SONGS_FILE, LEGACY_SONGS_FILE } = require('../config/env');

let inMemoryCache = null;

/**
 * Reads songs from in-memory cache if available, or from disk.
 * Handles empty arrays correctly without false-fallback to legacy file.
 */
function readSongs() {
  if (inMemoryCache !== null && Array.isArray(inMemoryCache)) {
    return inMemoryCache;
  }

  try {
    if (fs.existsSync(SONGS_FILE)) {
      const raw = fs.readFileSync(SONGS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryCache = parsed;
        return parsed;
      }
    }

    // Fallback to legacy file location only if primary file did not exist
    if (LEGACY_SONGS_FILE && fs.existsSync(LEGACY_SONGS_FILE)) {
      const rawLegacy = fs.readFileSync(LEGACY_SONGS_FILE, 'utf8');
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy)) {
        inMemoryCache = parsedLegacy;
        writeSongs(parsedLegacy);
        return parsedLegacy;
      }
    }
  } catch (err) {
    console.error('Error reading songs store:', err);
  }

  inMemoryCache = [];
  return [];
}

/**
 * Writes songs to in-memory cache and asynchronously persists to disk atomically.
 */
function writeSongs(songs) {
  if (!Array.isArray(songs)) {
    console.warn('writeSongs received invalid songs array');
    return;
  }

  inMemoryCache = songs;

  try {
    const parentDir = path.dirname(SONGS_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Atomic write: write to temp file then rename
    const tempFile = `${SONGS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(songs, null, 2), 'utf8');
    fs.renameSync(tempFile, SONGS_FILE);
  } catch (err) {
    console.error('Error writing songs store:', err);
  }
}

/**
 * Clears the in-memory cache (e.g. for testing or fresh reload)
 */
function invalidateCache() {
  inMemoryCache = null;
}

module.exports = { readSongs, writeSongs, invalidateCache };
