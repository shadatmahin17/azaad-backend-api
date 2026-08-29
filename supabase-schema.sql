-- ==============================================================================
-- POSTGRESQL SCHEMA FOR SUPABASE: PROFILES, ARTISTS, ALBUMS, SONGS, PLAYLISTS
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USER PROFILES TABLE (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.handle_profiles_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.handle_profiles_updated_at();

-- 3. ARTISTS TABLE
CREATE TABLE IF NOT EXISTS public.artists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  bio TEXT,
  image_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ALBUMS TABLE (Linked to artists via Foreign Key)
CREATE TABLE IF NOT EXISTS public.albums (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE SET NULL,
  cover_url TEXT,
  release_year INT,
  genre TEXT DEFAULT 'Fusion / World',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SONGS TABLE (Linked to artists, albums, and auth users via Foreign Keys)
CREATE TABLE IF NOT EXISTS public.songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  singers TEXT,
  category TEXT DEFAULT 'Other',
  genre TEXT DEFAULT 'Fusion / World',
  type TEXT DEFAULT 'Original',
  vibe TEXT DEFAULT 'Chill',
  featured BOOLEAN DEFAULT FALSE,
  trending BOOLEAN DEFAULT FALSE,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  duration NUMERIC DEFAULT 0,
  artist_id TEXT REFERENCES public.artists(id) ON DELETE SET NULL,
  album_id TEXT REFERENCES public.albums(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PLAYLISTS TABLE (Linked to auth users via Foreign Key)
CREATE TABLE IF NOT EXISTS public.playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  cover_url TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. PLAYLIST SONGS JUNCTION TABLE (Many-to-Many playlists <-> songs)
CREATE TABLE IF NOT EXISTS public.playlist_songs (
  id BIGSERIAL PRIMARY KEY,
  playlist_id TEXT NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES public.songs(id) ON DELETE CASCADE,
  position INT DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_playlist_song UNIQUE(playlist_id, song_id)
);

-- 8. USER EVENTS / AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.user_events (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  provider TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 9. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_songs_artist_id ON public.songs(artist_id);
CREATE INDEX IF NOT EXISTS idx_songs_album_id ON public.songs(album_id);
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON public.songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_albums_artist_id ON public.albums(artist_id);
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON public.playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song ON public.playlist_songs(song_id);

-- 10. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- 11. ROW LEVEL SECURITY POLICIES (No Storage foldername array comparisons)
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
CREATE POLICY "Read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Public view artists" ON public.artists;
CREATE POLICY "Public view artists" ON public.artists FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth manage artists" ON public.artists;
CREATE POLICY "Auth manage artists" ON public.artists FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view albums" ON public.albums;
CREATE POLICY "Public view albums" ON public.albums FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth manage albums" ON public.albums;
CREATE POLICY "Auth manage albums" ON public.albums FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public view songs" ON public.songs;
CREATE POLICY "Public view songs" ON public.songs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth insert songs" ON public.songs;
CREATE POLICY "Auth insert songs" ON public.songs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Auth update songs" ON public.songs;
CREATE POLICY "Auth update songs" ON public.songs FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Auth delete songs" ON public.songs;
CREATE POLICY "Auth delete songs" ON public.songs FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "View playlists" ON public.playlists;
CREATE POLICY "View playlists" ON public.playlists FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Manage own playlists" ON public.playlists;
CREATE POLICY "Manage own playlists" ON public.playlists FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "View playlist items" ON public.playlist_songs;
CREATE POLICY "View playlist items" ON public.playlist_songs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_songs.playlist_id AND (p.is_public = true OR p.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Manage playlist items" ON public.playlist_songs;
CREATE POLICY "Manage playlist items" ON public.playlist_songs FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_songs.playlist_id AND p.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Auth insert user_events" ON public.user_events;
CREATE POLICY "Auth insert user_events" ON public.user_events FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Users read own user_events" ON public.user_events;
CREATE POLICY "Users read own user_events" ON public.user_events FOR SELECT TO authenticated USING (auth.uid() = user_id);
