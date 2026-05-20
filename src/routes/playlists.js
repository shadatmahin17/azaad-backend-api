const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { readPlaylists, writePlaylists } = require('../utils/playlists');

const router = express.Router();

router.get('/', (req, res) => {
  const playlists = readPlaylists();
  res.json({ playlists });
});

router.get('/:id', (req, res) => {
  const playlists = readPlaylists();
  const playlist = playlists.find((p) => p.id === req.params.id);
  if (!playlist) {
    return res.status(404).json({ error: 'Playlist not found' });
  }
  return res.json(playlist);
});

router.post('/', requireAuth, (req, res) => {
  const playlists = readPlaylists();

  const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
  const songIds = Array.isArray(req.body.songIds) ? req.body.songIds : [];

  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  const userId = req.supabaseUser?.id || 'admin';
  const userName = req.supabaseUser?.user_metadata?.full_name || req.supabaseUser?.email || 'Admin';

  const newPlaylist = {
    id: crypto.randomUUID(),
    name,
    description,
    songIds,
    createdBy: { id: userId, name: userName },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  playlists.unshift(newPlaylist);
  writePlaylists(playlists);

  return res.status(201).json(newPlaylist);
});

router.put('/:id', requireAuth, (req, res) => {
  const playlists = readPlaylists();
  const index = playlists.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const current = playlists[index];
  const name = typeof req.body.name === 'string' ? req.body.name.trim() : current.name;
  const description = typeof req.body.description === 'string' ? req.body.description.trim() : current.description;
  const songIds = Array.isArray(req.body.songIds) ? req.body.songIds : current.songIds;

  playlists[index] = {
    ...current,
    name,
    description,
    songIds,
    updatedAt: new Date().toISOString(),
  };

  writePlaylists(playlists);
  return res.json(playlists[index]);
});

router.delete('/:id', requireAuth, (req, res) => {
  const playlists = readPlaylists();
  const index = playlists.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  playlists.splice(index, 1);
  writePlaylists(playlists);
  return res.json({ ok: true, message: 'Playlist deleted' });
});

router.post('/:id/songs', requireAuth, (req, res) => {
  const playlists = readPlaylists();
  const index = playlists.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  const songId = typeof req.body.songId === 'string' ? req.body.songId.trim() : '';
  if (!songId) {
    return res.status(400).json({ error: 'songId is required' });
  }

  if (playlists[index].songIds.includes(songId)) {
    return res.json(playlists[index]);
  }

  playlists[index].songIds.push(songId);
  playlists[index].updatedAt = new Date().toISOString();
  writePlaylists(playlists);
  return res.json(playlists[index]);
});

router.delete('/:id/songs/:songId', requireAuth, (req, res) => {
  const playlists = readPlaylists();
  const index = playlists.findIndex((p) => p.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Playlist not found' });
  }

  playlists[index].songIds = playlists[index].songIds.filter(
    (sid) => sid !== req.params.songId
  );
  playlists[index].updatedAt = new Date().toISOString();
  writePlaylists(playlists);
  return res.json(playlists[index]);
});

module.exports = router;
