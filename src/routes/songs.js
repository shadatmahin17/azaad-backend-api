const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { requireApiKey } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { readSongs, writeSongs } = require('../utils/songs');
const { normalizeMediaUrl, isAllowedMediaUrl } = require('../utils/media');
const { normalizeCategory } = require('../utils/category');
const { ROOT_DIR } = require('../config/env');

const router = express.Router();

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

router.get('/', (req, res) => {
  const songs = readSongs();

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * limit;
  const paginatedSongs = songs.slice(offset, offset + limit);

  const normalizedSongs = paginatedSongs.map((song) => ({
    ...song,
    coverUrl: normalizeMediaUrl(song.coverUrl),
    audioUrl: normalizeMediaUrl(song.audioUrl),
  }));

  res.json({
    songs: normalizedSongs,
    pagination: {
      page,
      limit,
      total: songs.length,
      totalPages: Math.ceil(songs.length / limit),
    },
  });
});

router.post(
  '/',
  requireApiKey,
  upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
  ]),
  (req, res) => {
    try {
      const songs = readSongs();

      const {
        title,
        artist,
        category,
        featured,
        trending,
        audioUrl,
        coverUrl,
        genre,
        singers,
        type,
        vibe,
      } = req.body;
      const audioFile = req.files?.audio?.[0];
      const coverFile = req.files?.cover?.[0];
      const sanitizedAudioUrl = audioUrl ? String(audioUrl).trim() : '';
      const sanitizedCoverUrl = coverUrl ? String(coverUrl).trim() : '';
      const hasAudioSource = Boolean(audioFile) || Boolean(sanitizedAudioUrl);
      const hasCoverSource = Boolean(coverFile) || Boolean(sanitizedCoverUrl);

      if (!title || !artist || !hasAudioSource || !hasCoverSource) {
        return res.status(400).json({
          error:
            'title, artist, plus audio and cover (file or URL) are required',
        });
      }

      if (sanitizedAudioUrl && !isAllowedMediaUrl(sanitizedAudioUrl)) {
        return res
          .status(400)
          .json({ error: 'audioUrl must be a valid http(s) or s3:// URL' });
      }

      if (sanitizedCoverUrl && !isAllowedMediaUrl(sanitizedCoverUrl)) {
        return res
          .status(400)
          .json({ error: 'coverUrl must be a valid http(s) or s3:// URL' });
      }

      const newSong = {
        id: crypto.randomUUID(),
        title: String(title).trim(),
        artist: String(artist).trim(),
        category: normalizeCategory(category),
        genre: genre ? String(genre).trim() : '',
        singers: singers ? String(singers).trim() : String(artist).trim(),
        type: type ? String(type).trim() : '',
        vibe: vibe ? String(vibe).trim() : '',
        featured: featured === 'true' || featured === true,
        trending: trending === 'true' || trending === true,
        coverUrl: coverFile
          ? `/uploads/covers/${coverFile.filename}`
          : normalizeMediaUrl(sanitizedCoverUrl),
        audioUrl: audioFile
          ? `/uploads/audio/${audioFile.filename}`
          : normalizeMediaUrl(sanitizedAudioUrl),
        createdAt: new Date().toISOString(),
      };

      songs.unshift(newSong);
      writeSongs(songs);

      return res.status(201).json(newSong);
    } catch (error) {
      console.error('Song creation failed:', error);
      return res.status(500).json({ error: 'Upload failed' });
    }
  }
);

router.put('/:id', requireApiKey, (req, res) => {
  try {
    const songs = readSongs();
    const index = songs.findIndex((song) => song.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const currentSong = songs[index];
    const title =
      typeof req.body.title === 'string'
        ? req.body.title.trim()
        : currentSong.title;
    const artist =
      typeof req.body.artist === 'string'
        ? req.body.artist.trim()
        : currentSong.artist;
    const category =
      typeof req.body.category === 'string'
        ? normalizeCategory(req.body.category)
        : currentSong.category || 'Other';
    const genre =
      typeof req.body.genre === 'string'
        ? req.body.genre.trim()
        : currentSong.genre || '';
    const singers =
      typeof req.body.singers === 'string'
        ? req.body.singers.trim()
        : currentSong.singers || currentSong.artist;
    const type =
      typeof req.body.type === 'string'
        ? req.body.type.trim()
        : currentSong.type || '';
    const vibe =
      typeof req.body.vibe === 'string'
        ? req.body.vibe.trim()
        : currentSong.vibe || '';

    const parseFeaturedTrending = (value, fallback) => {
      if (typeof value === 'boolean') return value;
      if (value === 'true') return true;
      if (value === 'false') return false;
      return fallback;
    };

    const featured = parseFeaturedTrending(
      req.body.featured,
      currentSong.featured
    );
    const trending = parseFeaturedTrending(
      req.body.trending,
      currentSong.trending
    );

    const coverUrl =
      typeof req.body.coverUrl === 'string'
        ? req.body.coverUrl.trim()
        : currentSong.coverUrl;
    const audioUrl =
      typeof req.body.audioUrl === 'string'
        ? req.body.audioUrl.trim()
        : currentSong.audioUrl;

    if (!title || !artist) {
      return res
        .status(400)
        .json({ error: 'title and artist are required' });
    }

    if (
      audioUrl &&
      !audioUrl.startsWith('/uploads/') &&
      !isAllowedMediaUrl(audioUrl)
    ) {
      return res.status(400).json({
        error:
          'audioUrl must be a valid http(s), s3:// URL, or local upload path',
      });
    }

    if (
      coverUrl &&
      !coverUrl.startsWith('/uploads/') &&
      !isAllowedMediaUrl(coverUrl)
    ) {
      return res.status(400).json({
        error:
          'coverUrl must be a valid http(s), s3:// URL, or local upload path',
      });
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
      audioUrl: audioUrl ? normalizeMediaUrl(audioUrl) : currentSong.audioUrl,
    };

    songs[index] = updatedSong;
    writeSongs(songs);
    return res.json(updatedSong);
  } catch (error) {
    console.error('Song update failed:', error);
    return res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:id', requireApiKey, (req, res) => {
  try {
    const songs = readSongs();
    const index = songs.findIndex((song) => song.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const removed = songs[index];
    songs.splice(index, 1);

    const removeIfLocal = (relativeUrl) => {
      if (!relativeUrl || typeof relativeUrl !== 'string') return;
      if (!relativeUrl.startsWith('/uploads/')) return;
      const safePath = path.normalize(relativeUrl).replace(/^\//, '');
      if (!safePath.startsWith('uploads/')) return;
      const fullPath = path.join(ROOT_DIR, safePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    };

    removeIfLocal(removed.coverUrl);
    removeIfLocal(removed.audioUrl);

    writeSongs(songs);
    return res.json({ success: true, removed });
  } catch (error) {
    console.error('Song deletion failed:', error);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

module.exports = router;
