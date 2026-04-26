import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus,
  Upload,
  Search,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Music2,
  ShieldCheck,
  RefreshCw,
  Globe,
  ExternalLink,
  Save,
  Camera,
  LogOut,
  X,
  Menu,
  ImageIcon,
  Sparkles,
  Clock3,
  User,
  Mail,
  PenLine,
  CalendarDays
} from 'lucide-react';

const DEFAULT_API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api/songs` : 'http://localhost:5000/api/songs';
const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
const MAIN_SITE_URL = 'https://azzad-music-site-ruby.vercel.app/';
const SERVER_BASE = API_BASE.replace('/api/songs', '');
const MAIN_LOGO_SOURCE = '/img/Black-Logo.png';
const APP_BACKGROUND_IMAGE_URL = 'https://mahin-cloud-storage.s3.ap-southeast-1.amazonaws.com/img/Background.jpg';
const APP_DARK_BACKGROUND_STYLE = {
  backgroundImage: `url(${APP_BACKGROUND_IMAGE_URL})`,
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
  backgroundAttachment: 'fixed'
};

const normalizeS3Url = (url) => {
  if (!url || typeof url !== 'string') return url;
  const trimmed = url.trim();
  if (!trimmed.toLowerCase().startsWith('s3://')) return trimmed;

  const withoutProtocol = trimmed.slice(5);
  const slashIndex = withoutProtocol.indexOf('/');
  if (slashIndex === -1) return trimmed;

  const bucket = withoutProtocol.slice(0, slashIndex);
  const key = withoutProtocol.slice(slashIndex + 1);
  if (!bucket || !key) return trimmed;
  return `https://${bucket}.s3.amazonaws.com/${encodeURI(key)}`;
};

const LOGO_URL = normalizeS3Url(MAIN_LOGO_SOURCE);
const BRAND_FONT_FAMILY = "'Montserrat', 'Inter', sans-serif";
const TAGLINE_FONT_FAMILY = "'Inter', system-ui, sans-serif";

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const CATEGORY_OPTIONS = ['Hindi', 'Bangla', 'English', 'Nasheed', 'Sura', 'Other'];

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const normalizeSong = (song = {}, index = 0) => {
  const normalizedId = firstNonEmptyString(song.id, song._id, song.songId) || `song-${index}-${firstNonEmptyString(song.title, song.name, song.trackName) || 'untitled'}`;
  return {
    ...song,
    id: normalizedId,
    title: firstNonEmptyString(song.title, song.name, song.trackName, song.songName) || 'Untitled',
    artist: firstNonEmptyString(song.artist, song.singer, song.singers, song.author) || 'Unknown',
    singers: firstNonEmptyString(song.singers, song.singer, song.artist),
    coverUrl: firstNonEmptyString(song.coverUrl, song.cover, song.coverImage, song.image, song.thumbnail, song.artwork),
    audioUrl: firstNonEmptyString(song.audioUrl, song.audio, song.songUrl, song.trackUrl, song.url, song.src)
  };
};

const sidebarGroups = [
  { title: 'Discover', items: ['Home', 'Albums', 'Artists'] },
  { title: 'Your Library', items: ['Favorites', 'Recently Played', 'Playlists'] },
  { title: 'Info', items: ['About', 'Contact Us'] }
];

export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('azaad_api_key') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('azaad_api_key')));
  const [view, setView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [themeMode, setThemeMode] = useState(localStorage.getItem('azaad_theme_mode') || 'dark');

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const successTimer = useRef(null);
  const searchInputRef = useRef(null);

  const [branding, setBranding] = useState({
    siteName: localStorage.getItem('site_name') || 'AZAAD MUSIC',
    logoText: localStorage.getItem('logo_text') || 'AZ',
    themeColor: localStorage.getItem('theme_color') || '#6366f1',
    adminName: localStorage.getItem('admin_name') || 'Azad Hossain',
    adminEmail: localStorage.getItem('admin_email') || 'admin@azaad.com',
    adminPhoto: localStorage.getItem('admin_photo') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Azad',
    bio: localStorage.getItem('admin_bio') || 'Full Stack Developer & Music Producer'
  });

  const [previews, setPreviews] = useState({ audio: '', cover: '', avatar: '' });

  const showSuccess = (message, timeout = 2200) => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setSuccess(message);
    successTimer.current = setTimeout(() => setSuccess(''), timeout);
  };

  const fetchSongs = useCallback(async () => {
    if (!isLoggedIn) return;
    setInitLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}?limit=200`);
      if (!res.ok) throw new Error('Failed to fetch songs.');
      const data = await res.json();
      const songList = Array.isArray(data) ? data : (data.songs || []);
      setSongs(songList.map((song, index) => normalizeSong(song, index)));
    } catch (err) {
      setError(err.message || 'Server connection failed. Is backend running?');
    } finally {
      setInitLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  useEffect(() => () => {
    if (successTimer.current) clearTimeout(successTimer.current);
  }, []);

  useEffect(() => {
    localStorage.setItem('azaad_theme_mode', themeMode);
  }, [themeMode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === '/' && view === 'dashboard' && !['INPUT', 'TEXTAREA'].includes(event.target.tagName)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.key === 'Escape' && view === 'dashboard' && document.activeElement === searchInputRef.current) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [view]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${SERVER_BASE}/api/auth-check`, {
        headers: { 'x-api-key': apiKey.trim() },
      });
      if (!res.ok) {
        setError('Invalid API key. Please try again.');
        return;
      }
      localStorage.setItem('azaad_api_key', apiKey.trim());
      setApiKey(apiKey.trim());
      setIsLoggedIn(true);
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('azaad_api_key');
    setApiKey('');
    setIsLoggedIn(false);
    setSongs([]);
  };

  const handleFilePreview = (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isAudio = target === 'audio';
    const limit = isAudio ? MAX_AUDIO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > limit) {
      setError(`${target} file is too large.`);
      e.target.value = '';
      return;
    }

    if (isAudio && !file.type.startsWith('audio/')) {
      setError('Please choose a valid audio file.');
      e.target.value = '';
      return;
    }

    if (!isAudio && target !== 'avatar' && !file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      e.target.value = '';
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [target]: url }));
    setError('');

    if (target === 'avatar') {
      setBranding((prev) => ({ ...prev, adminPhoto: url }));
      localStorage.setItem('admin_photo', url);
    }
  };

  const handleAddTrack = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const fd = new FormData(e.target);
    fd.set('featured', String(e.target.featured.checked));
    fd.set('trending', String(e.target.trending.checked));
    if (!fd.get('category')) fd.set('category', 'Other');

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: fd
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      e.target.reset();
      setPreviews((prev) => ({ ...prev, audio: '', cover: '' }));
      await fetchSongs();
      setView('dashboard');
      showSuccess('Track added to your library!', 1500);
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrack = async (id) => {
    if (!window.confirm('Are you sure you want to remove this track?')) return;

    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': apiKey }
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete request failed.');
      }

      setSongs((prev) => prev.filter((song) => song.id !== id));
      showSuccess('Track removed.');
    } catch (err) {
      setError(err.message || 'Delete request failed.');
    }
  };

  const updateBranding = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...branding,
      siteName: String(fd.get('siteName') || '').trim(),
      logoText: String(fd.get('logoText') || '').trim(),
      themeColor: fd.get('themeColor'),
      adminName: String(fd.get('adminName') || '').trim(),
      adminEmail: String(fd.get('adminEmail') || '').trim(),
      bio: String(fd.get('bio') || '').trim()
    };

    setBranding(updated);
    localStorage.setItem('site_name', updated.siteName);
    localStorage.setItem('logo_text', updated.logoText);
    localStorage.setItem('theme_color', updated.themeColor);
    localStorage.setItem('admin_name', updated.adminName);
    localStorage.setItem('admin_email', updated.adminEmail);
    localStorage.setItem('admin_bio', updated.bio);
    showSuccess('Profile & branding updated.');
  };

  const featuredSong = songs[0];
  const isLightTheme = themeMode === 'light';

  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return songs;
    return songs.filter((song) =>
      [song.title, song.artist, song.category, song.genre, song.singers, song.type, song.vibe]
        .some((value) => String(value || '').toLowerCase().includes(q))
    );
  }, [songs, searchQuery]);

  const categories = useMemo(() => {
    const list = [...CATEGORY_OPTIONS];
    songs.forEach((song) => {
      const c = song.category || 'Other';
      if (!list.includes(c)) list.push(c);
    });
    return list.slice(0, 8);
  }, [songs]);

  const recentTracks = useMemo(() => songs.filter((song) => song.createdAt).slice(0, 5), [songs]);

  const mediaUrl = (url) => {
    if (!url) return url;
    const normalized = normalizeS3Url(url);
    if (!normalized || normalized.startsWith('http')) return normalized;
    const normalizedPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
    return `${SERVER_BASE}${normalizedPath}`;
  };

  if (!isLoggedIn) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 ${isLightTheme ? 'bg-slate-100 text-slate-900' : 'text-white'}`}
        style={isLightTheme ? undefined : APP_DARK_BACKGROUND_STYLE}
      >
        <div className={`w-full max-w-md rounded-3xl p-8 space-y-8 ${isLightTheme ? 'bg-white border border-slate-200 shadow-xl' : 'bg-white/[0.03] border border-white/10'}`}>
          <div className="text-center space-y-3">
            <div style={{ backgroundColor: branding.themeColor }} className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <img src={LOGO_URL} alt="Azaad logo" className={`w-14 h-14 rounded-xl object-cover mx-auto ${isLightTheme ? 'border border-slate-200' : 'border border-white/10'}`} />
            <h1 style={{ fontFamily: BRAND_FONT_FAMILY, fontWeight: 800 }} className="text-2xl uppercase tracking-wide">{branding.siteName}</h1>
            <p className={`text-xs uppercase tracking-[0.3em] ${isLightTheme ? 'text-slate-500' : 'text-neutral-500'}`}>Admin Dashboard Access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} required placeholder="Enter API Key" className={`w-full px-5 py-4 rounded-2xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/50 border border-white/10'}`} />
            {error && <p className="text-red-400 text-sm text-center">{error}</p>}
            <button disabled={loading} style={{ backgroundColor: branding.themeColor }} className="w-full py-4 rounded-2xl font-bold disabled:opacity-50">
              {loading ? 'Authenticating...' : 'Authenticate'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex relative overflow-hidden ${isLightTheme ? 'bg-slate-100 text-slate-800' : 'text-neutral-200'}`}
      style={isLightTheme ? undefined : APP_DARK_BACKGROUND_STYLE}
    >
      {!isLightTheme && <div className="pointer-events-none absolute -top-24 -left-20 w-80 h-80 bg-indigo-500/20 blur-3xl rounded-full" />}
      {!isLightTheme && <div className="pointer-events-none absolute top-1/3 -right-24 w-96 h-96 bg-fuchsia-500/10 blur-3xl rounded-full" />}
      {!isLightTheme && <div className="pointer-events-none absolute -bottom-24 left-1/3 w-80 h-80 bg-cyan-500/10 blur-3xl rounded-full" />}

      <div className={`hidden md:flex fixed top-4 left-4 z-50 items-center gap-3 px-3 py-2 rounded-2xl backdrop-blur-xl shadow-2xl ${isLightTheme ? 'bg-white/90 border border-slate-200' : 'bg-black/70 border border-white/10'}`}>
        <img src={LOGO_URL} alt="Azaad fixed logo" className="w-9 h-9 rounded-lg object-cover border border-white/10" />
        <div>
          <p style={{ fontFamily: BRAND_FONT_FAMILY, fontWeight: 800 }} className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">Azaad</p>
          <p className={`text-xs font-semibold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Admin Dashboard</p>
        </div>
      </div>

      <aside className={`fixed md:sticky top-0 z-40 h-screen w-72 p-6 overflow-y-auto transition-transform ${isLightTheme ? 'bg-white border-r border-slate-200' : 'bg-black border-r border-white/10'} ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between md:hidden mb-4">
          <span className="font-bold">Menu</span>
          <button onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${isLightTheme ? 'bg-slate-100' : 'bg-white/10'}`}><X className="w-4 h-4" /></button>
        </div>

        <div className="flex items-center gap-3 mb-10">
          <img src={LOGO_URL} alt={`${branding.siteName} logo`} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
          <div style={{ backgroundColor: branding.themeColor }} className="w-10 h-10 rounded-xl flex items-center justify-center font-black">{branding.logoText}</div>
          <div>
            <p style={{ fontFamily: BRAND_FONT_FAMILY, fontWeight: 800 }} className="uppercase tracking-wide">{branding.siteName}</p>
            <p style={{ fontFamily: TAGLINE_FONT_FAMILY, fontWeight: 400 }} className={`text-[11px] ${isLightTheme ? 'text-slate-500' : 'text-neutral-500'}`}>The Clarity You Deserve</p>
          </div>
        </div>

        {sidebarGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <p className={`text-xs uppercase tracking-[0.25em] mb-2 ${isLightTheme ? 'text-slate-500' : 'text-neutral-500'}`}>{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    if (item === 'Home') setView('dashboard');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    item === 'Home' && view === 'dashboard'
                      ? (isLightTheme ? 'bg-slate-100 text-slate-900' : 'bg-white/20 text-white')
                      : (isLightTheme ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900' : 'text-neutral-300 hover:bg-white/10 hover:text-white')
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className={`mt-6 p-3 rounded-xl ${isLightTheme ? 'bg-slate-50 border border-slate-200' : 'bg-white/[0.03] border border-white/10'}`}>
          <p className={`text-xs mb-3 ${isLightTheme ? 'text-slate-500' : 'text-neutral-500'}`}>Queue</p>
          <p className="text-sm font-semibold truncate">{featuredSong ? featuredSong.title : 'Loading...'}</p>
          <p className={`text-xs truncate ${isLightTheme ? 'text-slate-500' : 'text-neutral-500'}`}>{featuredSong ? featuredSong.artist : 'No song selected'}</p>
        </div>

        <div className="mt-6 space-y-2">
          <button
            onClick={() => {
              setView('add');
              setIsMobileMenuOpen(false);
            }}
            style={{ backgroundColor: branding.themeColor }}
            className="w-full py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add New Track
          </button>
          <button
            onClick={() => {
              setView('profile');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full py-2 rounded-lg text-sm transition-colors ${view === 'profile' ? (isLightTheme ? 'bg-slate-200 text-slate-900' : 'bg-white/20 text-white') : (isLightTheme ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/10 hover:bg-white/20')}`}
          >
            Settings & Profile
          </button>
          <a href={MAIN_SITE_URL} target="_blank" rel="noreferrer" className={`w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10'}`}><Globe className="w-4 h-4" /> Live Site <ExternalLink className="w-3 h-3" /></a>
          <button onClick={handleLogout} className={`w-full py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${isLightTheme ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'}`}><LogOut className="w-4 h-4" /> Logout</button>
        </div>
      </aside>

      <main className="flex-1 md:ml-0 w-full relative z-10">
        <header className={`sticky top-0 z-30 backdrop-blur-2xl px-6 py-4 flex items-center justify-between gap-4 ${isLightTheme ? 'bg-white/90 border-b border-slate-200' : 'bg-[#050505]/70 border-b border-white/10'}`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className={`md:hidden p-2 rounded-lg ${isLightTheme ? 'bg-slate-100' : 'bg-white/10'}`}><Menu className="w-4 h-4" /></button>
            <div>
              <h2 className={`font-bold ${isLightTheme ? 'text-slate-900' : 'text-white'}`}>Experience Music Without Noise</h2>
              <p className={`text-xs ${isLightTheme ? 'text-slate-500' : 'text-neutral-500'}`}>Free. Ad-free. Smart playlists powered by Azaad AI.</p>
            </div>
          </div>
          <div className="flex items-center gap-2"><button onClick={fetchSongs} className={`p-2.5 rounded-lg ${isLightTheme ? 'bg-slate-100 hover:bg-slate-200' : 'bg-white/10 hover:bg-white/20'}`} aria-label="Refresh songs">
            <RefreshCw className={`w-4 h-4 ${initLoading ? 'animate-spin' : ''}`} />
          </button></div>
        </header>

        <section className="p-6 md:p-8 space-y-6">
          {success && <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${isLightTheme ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-300'}`}><CheckCircle2 className="w-4 h-4" /> {success}</div>}
          {error && <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${isLightTheme ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-red-500/15 border border-red-500/20 text-red-300'}`}><AlertCircle className="w-4 h-4" /> {error}</div>}

          {view === 'dashboard' && (
            <>
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-gradient-to-r from-indigo-500/30 to-fuchsia-500/20 rounded-3xl p-6 border border-white/10">
                  <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">Featured track</p>
                  <div className="mt-4 flex gap-4 items-center">
                    {featuredSong ? <img src={mediaUrl(featuredSong.coverUrl)} alt="featured cover" className="w-20 h-20 rounded-2xl object-cover" /> : <div className="w-20 h-20 rounded-2xl bg-white/10" />}
                    <div>
                      <h3 className="text-xl font-black">{featuredSong?.title || 'Loading track...'}</h3>
                      <p className="text-sm text-neutral-300">{featuredSong?.artist || 'Azaad picks a song for you'}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6">
                  <p className="text-xs text-neutral-500 uppercase">Library size</p>
                  <p className="text-4xl font-black mt-2">{songs.length}</p>
                  <p className="text-sm text-neutral-500 mt-1">tracks synced</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Discoverability</p>
                    <p className="text-sm text-white mt-1">Categorized songs</p>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles className="w-4 h-4" />
                    <span className="text-lg font-bold">{categories.length}</span>
                  </div>
                </div>
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase">Recently uploaded</p>
                    <p className="text-sm text-white mt-1">Tracks with timestamp</p>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <Clock3 className="w-4 h-4" />
                    <span className="text-lg font-bold">{recentTracks.length}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <span key={category} className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-neutral-200">{category}</span>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, singer, category, genre, type, vibe"
                  className="w-full pl-11 pr-24 py-3 rounded-xl bg-white/[0.03] border border-white/10"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500 bg-black/40 px-2 py-1 rounded-md">/</span>
              </div>

              {initLoading ? (
                <div className="text-center py-10 text-neutral-500">Loading songs...</div>
              ) : filteredSongs.length === 0 ? (
                <div className="text-center py-10 text-neutral-500 bg-white/[0.02] border border-white/10 rounded-2xl">
                  <p>No songs found.</p>
                  <button
                    onClick={() => setView('add')}
                    style={{ backgroundColor: branding.themeColor }}
                    className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                  >
                    Add your first track
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredSongs.map((song) => (
                    <article key={song.id} className="bg-white/[0.03] rounded-2xl border border-white/10 overflow-hidden">
                      <img src={mediaUrl(song.coverUrl)} alt={song.title} className="w-full h-44 object-cover" />
                      <div className="p-4">
                        <h4 className="font-bold truncate">{song.title}</h4>
                        <p className="text-xs text-neutral-400">{song.singers || song.artist}</p>
                        <p className="text-xs text-neutral-500 mt-1">{song.category || 'Other'} {song.genre ? `• ${song.genre}` : ''}</p>
                        <p className="text-[11px] text-neutral-500 mt-1">{song.type || 'Music'} {song.vibe ? `• ${song.vibe}` : ''}</p>
                        <button onClick={() => deleteTrack(song.id)} className="mt-3 px-3 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {view === 'add' && (
            <form onSubmit={handleAddTrack} className={`max-w-3xl rounded-3xl p-6 space-y-5 ${isLightTheme ? 'bg-white border border-slate-200' : 'bg-white/[0.03] border border-white/10'}`}>
              <h3 className="text-xl font-black">Publish New Track</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input name="title" required placeholder="Title" className={`px-4 py-3 rounded-xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/40 border border-white/10'}`} />
                <input name="artist" required placeholder="Artist (primary)" className={`px-4 py-3 rounded-xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/40 border border-white/10'}`} />
                <input name="singers" placeholder="Singer(s)" className={`px-4 py-3 rounded-xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/40 border border-white/10'}`} />
                <select name="category" defaultValue="Other" className={`px-4 py-3 rounded-xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/40 border border-white/10'}`}>
                  {CATEGORY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
                <input name="genre" placeholder="Genre" className={`px-4 py-3 rounded-xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/40 border border-white/10'}`} />
                <input name="type" placeholder="Type" className={`px-4 py-3 rounded-xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/40 border border-white/10'}`} />
                <input name="vibe" placeholder="Vibe" className={`px-4 py-3 rounded-xl ${isLightTheme ? 'bg-white border border-slate-300 text-slate-900' : 'bg-black/40 border border-white/10'}`} />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="h-36 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 cursor-pointer bg-black/20">
                  <Upload className="w-5 h-5" />
                  <span className="text-xs">{previews.audio ? 'Audio ready' : 'Upload audio'}</span>
                  <input type="file" name="audio" accept="audio/*" onChange={(e) => handleFilePreview(e, 'audio')} className="hidden" required />
                </label>
                <label className="h-36 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 cursor-pointer bg-black/20 overflow-hidden">
                  {previews.cover ? <img src={previews.cover} alt="cover preview" className="w-full h-full object-cover" /> : <><ImageIcon className="w-5 h-5" /><span className="text-xs">Upload cover image</span></>}
                  <input type="file" name="cover" accept="image/*" onChange={(e) => handleFilePreview(e, 'cover')} className="hidden" required />
                </label>
              </div>

              <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" name="featured" /> Featured</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="trending" /> Trending</label>
              </div>

              <button disabled={loading} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 flex items-center justify-center gap-2 font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Music2 className="w-4 h-4" />} {loading ? 'Uploading...' : 'Publish Track'}
              </button>
            </form>
          )}

          {view === 'profile' && (
            <form onSubmit={updateBranding} className="w-full max-w-5xl space-y-6">
              <section
                className="rounded-[2rem] border border-emerald-400/45 bg-cover bg-center bg-no-repeat p-8 md:p-10 text-white relative overflow-hidden"
                style={{ backgroundImage: `linear-gradient(180deg, rgba(11,21,18,0.58), rgba(5,14,12,0.78)), url(${APP_BACKGROUND_IMAGE_URL})` }}
              >
                <div className="absolute inset-0 backdrop-blur-[1px]" />
                <div className="relative z-10 flex flex-col items-center text-center">
                  <label className="relative cursor-pointer group">
                    <img src={branding.adminPhoto} alt="admin" className="w-32 h-32 rounded-full object-cover border-4 border-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
                    <span className="absolute inset-0 bg-black/45 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </span>
                    <input type="file" accept="image/*" onChange={(e) => handleFilePreview(e, 'avatar')} className="hidden" />
                  </label>

                  <h3 className="mt-6 text-4xl font-black tracking-tight">{branding.adminName}</h3>
                  <p className="text-lg text-slate-300 font-semibold">{branding.adminEmail}</p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/45 border border-white/10 font-bold">
                      <Music2 className="w-4 h-4" /> {songs.length} Tracks
                    </span>
                    <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-black/45 border border-white/10 font-bold">
                      <CalendarDays className="w-4 h-4" /> Member since 2025
                    </span>
                  </div>
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/20 bg-slate-900/65 backdrop-blur-sm p-6 md:p-8 text-white">
                <h4 className="text-3xl font-black mb-5 flex items-center gap-3">
                  <User className="w-7 h-7 text-slate-100" /> Personal Information
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="text-xl font-extrabold flex items-center gap-2 mb-2 text-slate-200">
                      <User className="w-5 h-5 text-emerald-400" /> FULL NAME
                    </label>
                    <input name="adminName" defaultValue={branding.adminName} required placeholder="Admin Name" className="w-full px-5 py-3 rounded-full bg-white text-slate-900 text-3xl md:text-4xl font-black border border-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>

                  <div>
                    <label className="text-xl font-extrabold flex items-center gap-2 mb-2 text-slate-200">
                      <Mail className="w-5 h-5 text-emerald-400" /> EMAIL ADDRESS
                    </label>
                    <input name="adminEmail" defaultValue={branding.adminEmail} required placeholder="Admin Email" className="w-full px-5 py-3 rounded-full bg-white text-slate-900 text-3xl md:text-4xl font-black border border-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>

                  <div>
                    <label className="text-xl font-extrabold flex items-center gap-2 mb-2 text-slate-200">
                      <PenLine className="w-5 h-5 text-emerald-400" /> BIO
                    </label>
                    <input name="bio" defaultValue={branding.bio} placeholder="Bio" className="w-full px-5 py-3 rounded-full bg-white text-slate-900 text-lg md:text-xl font-semibold border border-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mt-6">
                  <input name="siteName" defaultValue={branding.siteName} required placeholder="Site Name" className="px-4 py-3 rounded-xl bg-white/95 text-slate-900 border border-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <input name="logoText" defaultValue={branding.logoText} required placeholder="Logo Text" className="px-4 py-3 rounded-xl bg-white/95 text-slate-900 border border-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <input type="color" name="themeColor" defaultValue={branding.themeColor} className="h-12 rounded-xl bg-white border border-white/80" />
                </div>

                <button className="mt-6 w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black flex items-center justify-center gap-2 transition-colors">
                  <Save className="w-4 h-4" /> Save Settings
                </button>
              </section>
            </form>
          )}
        </section>
      </main>

      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/70 z-30 md:hidden" />}
    </div>
  );
}
