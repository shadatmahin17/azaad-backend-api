const fs = require('fs');
const { SONGS_FILE } = require('../config/env');

function readSongs() {
  try {
    const raw = fs.readFileSync(SONGS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function writeSongs(songs) {
  fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2), 'utf8');
}

module.exports = { readSongs, writeSongs };
