const fs = require('fs');
const path = require('path');
const { PLAYLISTS_FILE } = require('../config/env');

let inMemoryPlaylists = null;

function readPlaylists() {
  if (inMemoryPlaylists !== null && Array.isArray(inMemoryPlaylists)) {
    return inMemoryPlaylists;
  }

  try {
    if (fs.existsSync(PLAYLISTS_FILE)) {
      const raw = fs.readFileSync(PLAYLISTS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        inMemoryPlaylists = parsed;
        return parsed;
      }
    }
  } catch (_err) {
    console.error('Error reading playlists store:', _err);
  }

  inMemoryPlaylists = [];
  return [];
}

function writePlaylists(playlists) {
  if (!Array.isArray(playlists)) return;
  inMemoryPlaylists = playlists;

  try {
    const parentDir = path.dirname(PLAYLISTS_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    const tempFile = `${PLAYLISTS_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(playlists, null, 2), 'utf8');
    fs.renameSync(tempFile, PLAYLISTS_FILE);
  } catch (err) {
    console.error('Error writing playlists store:', err);
  }
}

/**
 * Removes a deleted song ID from all existing playlists to prevent ghost IDs.
 */
function removeSongFromAllPlaylists(songId) {
  if (!songId) return;
  const playlists = readPlaylists();
  let modified = false;

  const updated = playlists.map((pl) => {
    if (Array.isArray(pl.songIds) && pl.songIds.includes(songId)) {
      modified = true;
      return {
        ...pl,
        songIds: pl.songIds.filter((id) => id !== songId),
        updatedAt: new Date().toISOString(),
      };
    }
    return pl;
  });

  if (modified) {
    writePlaylists(updated);
  }
}

module.exports = { readPlaylists, writePlaylists, removeSongFromAllPlaylists };
