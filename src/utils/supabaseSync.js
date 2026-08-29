const { supabaseAdmin } = require('../config/supabase');
const { SUPABASE_URL, SUPABASE_SONGS_BUCKET } = require('../config/env');
const { readSongs, writeSongs } = require('./songs');

/**
 * Scan Supabase Storage 'songs' bucket and sync any existing uploaded audio/covers
 */
async function syncSupabaseStorageSongs() {
  if (!supabaseAdmin) {
    return [];
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
    const { data: audioDirs, error: listErr } = await supabaseAdmin.storage.from(bucket).list('audio');
    if (listErr || !Array.isArray(audioDirs)) {
      return readSongs();
    }

    const currentSongs = readSongs();
    const songMap = new Map(currentSongs.map((s) => [s.id, s]));
    let hasChanges = false;

    for (const dir of audioDirs) {
      if (!dir.name || dir.name.startsWith('.')) continue;

      const songId = dir.name;
      const { data: aFiles } = await supabaseAdmin.storage.from(bucket).list(`audio/${songId}`);
      const { data: cFiles } = await supabaseAdmin.storage.from(bucket).list(`covers/${songId}`);

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
          // Update URLs if missing
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
