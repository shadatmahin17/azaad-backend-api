const { supabaseAdmin } = require('../config/supabase');
const { SUPABASE_URL, SUPABASE_SONGS_BUCKET } = require('../config/env');
const { readSongs, writeSongs } = require('./songs');

let inFlightSync = null;

/**
 * Scan Supabase Storage 'songs' bucket and sync any existing uploaded audio/covers.
 * Uses promise deduplication and concurrent batching to avoid N+1 blocking bottlenecks.
 */
async function syncSupabaseStorageSongs() {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = executeSync();
  try {
    return await inFlightSync;
  } finally {
    inFlightSync = null;
  }
}

async function executeSync() {
  if (!supabaseAdmin) {
    return readSongs();
  }

  try {
    // 1. Try querying the database 'songs' table first if it exists
    try {
      const { data: dbSongs, error: dbErr } = await supabaseAdmin
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (!dbErr && Array.isArray(dbSongs) && dbSongs.length > 0) {
        const mapped = dbSongs.map((row) => ({
          id: row.id,
          title: row.title,
          artist: row.artist,
          singers: row.singers || row.artist,
          category: row.category || 'Other',
          genre: row.genre || 'Fusion / World',
          type: row.type || 'Original',
          vibe: row.vibe || 'Chill',
          featured: Boolean(row.featured),
          trending: Boolean(row.trending),
          coverUrl: row.cover_url || '',
          audioUrl: row.audio_url || '',
          createdAt: row.created_at || new Date().toISOString(),
        }));
        writeSongs(mapped);
        return mapped;
      }
    } catch (_) {
      // Table may not exist yet, continue to storage scan
    }

    // 2. Scan Supabase Storage bucket for existing songs and covers
    const bucket = SUPABASE_SONGS_BUCKET || 'songs';
    if (!supabaseAdmin.storage || typeof supabaseAdmin.storage.from !== 'function') {
      return readSongs();
    }

    const { data: audioDirs, error: listErr } = await supabaseAdmin.storage.from(bucket).list('audio');
    if (listErr || !Array.isArray(audioDirs)) {
      return readSongs();
    }

    const currentSongs = readSongs();
    const songMap = new Map(currentSongs.map((s) => [s.id, s]));
    let hasChanges = false;

    // Filter valid song directories
    const validDirs = audioDirs.filter((dir) => dir.name && !dir.name.startsWith('.'));

    // Process in concurrent chunks of 6 to prevent connection starvation while avoiding serial delays
    const CHUNK_SIZE = 6;
    for (let i = 0; i < validDirs.length; i += CHUNK_SIZE) {
      const chunk = validDirs.slice(i, i + CHUNK_SIZE);
      await Promise.all(
        chunk.map(async (dir) => {
          const songId = dir.name;
          try {
            const [{ data: aFiles }, { data: cFiles }] = await Promise.all([
              supabaseAdmin.storage.from(bucket).list(`audio/${songId}`),
              supabaseAdmin.storage.from(bucket).list(`covers/${songId}`),
            ]);

            const audioFile = aFiles?.find((f) => !f.name.startsWith('.'));
            const coverFile = cFiles?.find((f) => !f.name.startsWith('.'));

            if (audioFile) {
              const audioUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/audio/${songId}/${audioFile.name}`;
              const coverUrl = coverFile
                ? `${SUPABASE_URL}/storage/v1/object/public/${bucket}/covers/${songId}/${coverFile.name}`
                : '';

              const existing = songMap.get(songId);
              if (!existing) {
                const newSong = {
                  id: songId,
                  title: `Track ${songId.substring(0, 8)}`,
                  artist: 'Azaad Artist',
                  singers: 'Azaad Artist',
                  category: 'Other',
                  genre: 'Fusion / World',
                  type: 'Original',
                  vibe: 'Chill',
                  featured: false,
                  trending: false,
                  audioUrl,
                  coverUrl,
                  createdAt: audioFile.created_at || new Date().toISOString(),
                };
                songMap.set(songId, newSong);
                hasChanges = true;
              } else {
                if (!existing.audioUrl || existing.audioUrl !== audioUrl) {
                  existing.audioUrl = audioUrl;
                  hasChanges = true;
                }
                if (coverUrl && (!existing.coverUrl || existing.coverUrl !== coverUrl)) {
                  existing.coverUrl = coverUrl;
                  hasChanges = true;
                }
              }
            }
          } catch (itemErr) {
            console.warn(`Sync item error for ${songId}:`, itemErr.message);
          }
        })
      );
    }

    const updatedSongs = Array.from(songMap.values());
    if (hasChanges || updatedSongs.length !== currentSongs.length) {
      writeSongs(updatedSongs);
    }
    return updatedSongs;
  } catch (err) {
    console.warn('Sync Supabase songs error:', err.message);
    return readSongs();
  }
}

module.exports = {
  syncSupabaseStorageSongs,
};
