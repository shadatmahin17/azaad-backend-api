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
  Save,
  Camera,
  LogOut,
  X,
  Menu,
  ImageIcon,
  User,
  Mail,
  PenLine,
  Library,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Edit3,
  LayoutGrid,
  List,
} from 'lucide-react';

const DEFAULT_API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api/songs` : 'http://localhost:5000/api/songs';
const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
const SERVER_BASE = API_BASE.replace('/api/songs', '');
const LOGO_URL = '/img/Logo.png';
const BLACK_LOGO_URL = '/img/Black-Logo.png';

const MAX_AUDIO_SIZE = 100 * 1024 * 1024;
const MAX_IMAGE_SIZE = 15 * 1024 * 1024;
const CATEGORY_OPTIONS = ['Hindi', 'Bangla', 'English', 'Nasheed', 'Sura', 'Other'];

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

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
};

const normalizeSong = (song = {}, index = 0) => {
  const normalizedId = firstNonEmptyString(song.id, song._id, song.songId) || `song-${index}`;
  return {
    ...song,
    id: normalizedId,
    title: firstNonEmptyString(song.title, song.name, song.trackName) || 'Untitled',
    artist: firstNonEmptyString(song.artist, song.singer, song.author) || 'Unknown',
    singers: firstNonEmptyString(song.singers, song.singer, song.artist),
    coverUrl: firstNonEmptyString(song.coverUrl, song.cover, song.coverImage, song.image),
    audioUrl: firstNonEmptyString(song.audioUrl, song.audio, song.songUrl, song.url),
  };
};

const mediaUrl = (url) => {
  if (!url) return url;
  const normalized = normalizeS3Url(url);
  if (!normalized || normalized.startsWith('http')) return normalized;
  const normalizedPath = normalized.startsWith('/') ? normalized : `/${normalized}`;
  return `${SERVER_BASE}${normalizedPath}`;
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ─── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ song, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    title: song.title || '',
    artist: song.artist || '',
    singers: song.singers || '',
    category: song.category || 'Other',
    genre: song.genre || '',
    type: song.type || '',
    vibe: song.vibe || '',
  });

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(song.id, form);
  };

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#111114] border border-white/10 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Edit Track</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-neutral-400 mb-1 block">Title</label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Artist</label>
              <input name="artist" value={form.artist} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Singer(s)</label>
              <input name="singers" value={form.singers} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Genre</label>
              <input name="genre" value={form.genre} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Type</label>
              <input name="type" value={form.type} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-neutral-400 mb-1 block">Vibe</label>
              <input name="vibe" value={form.vibe} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-white/10 text-neutral-300 hover:bg-white/5 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Audio Player Bar ──────────────────────────────────────────────────────────
function PlayerBar({ song, songs, onChangeSong }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [song.id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = false;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const playNext = () => {
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx < songs.length - 1) onChangeSong(songs[idx + 1]);
    else if (songs.length > 0) onChangeSong(songs[0]);
  };

  const playPrev = () => {
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx > 0) onChangeSong(songs[idx - 1]);
    else if (songs.length > 0) onChangeSong(songs[songs.length - 1]);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    playNext();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0c]/95 backdrop-blur-xl border-t border-white/10">
      <audio
        ref={audioRef}
        src={mediaUrl(song.audioUrl)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="h-1 bg-white/5 cursor-pointer group" onClick={handleSeek}>
        <div className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-colors relative" style={{ width: `${progress}%` }}>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-3 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img src={mediaUrl(song.coverUrl)} alt={song.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{song.title}</p>
            <p className="text-xs text-neutral-400 truncate">{song.singers || song.artist}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={playPrev} className="p-2 text-neutral-400 hover:text-white transition-colors">
            <SkipBack className="w-4 h-4" />
          </button>
          <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button onClick={playNext} className="p-2 text-neutral-400 hover:text-white transition-colors">
            <SkipForward className="w-4 h-4" />
          </button>
          <span className="text-xs text-neutral-500 ml-2 hidden sm:block">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>

        <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
          <button onClick={toggleMute} className="p-2 text-neutral-400 hover:text-white transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 accent-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Song Card ─────────────────────────────────────────────────────────────────
function SongCard({ song, isPlaying, onPlay, onEdit, onDelete, viewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="group flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img src={mediaUrl(song.coverUrl)} alt={song.title} className="w-full h-full object-cover" />
          <button
            onClick={() => onPlay(song)}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isPlaying ? 'text-indigo-400' : 'text-white'}`}>{song.title}</p>
          <p className="text-xs text-neutral-500 truncate">{song.singers || song.artist}</p>
        </div>
        <span className="text-xs text-neutral-600 hidden sm:block">{song.category || 'Other'}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(song)} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(song.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05] transition-all duration-200">
      <div className="relative aspect-square overflow-hidden">
        <img src={mediaUrl(song.coverUrl)} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <button
          onClick={() => onPlay(song)}
          className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:bg-indigo-500 hover:scale-110"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        {isPlaying && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-indigo-600/90 text-[10px] font-bold text-white flex items-center gap-1">
            <span className="inline-flex gap-0.5">
              <span className="w-0.5 h-3 bg-white rounded-full animate-pulse" />
              <span className="w-0.5 h-2 bg-white rounded-full animate-pulse [animation-delay:0.15s]" />
              <span className="w-0.5 h-3.5 bg-white rounded-full animate-pulse [animation-delay:0.3s]" />
            </span>
            Playing
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className={`font-semibold truncate text-sm ${isPlaying ? 'text-indigo-400' : 'text-white'}`}>{song.title}</h4>
        <p className="text-xs text-neutral-500 truncate mt-0.5">{song.singers || song.artist}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-neutral-600 uppercase tracking-wider">{song.category || 'Other'}{song.genre ? ` · ${song.genre}` : ''}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(song)} className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-white transition-colors" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(song.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-neutral-500 hover:text-red-400 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState(localStorage.getItem('azaad_api_key') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(Boolean(localStorage.getItem('azaad_api_key')));
  const [view, setView] = useState('library');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  const [currentSong, setCurrentSong] = useState(null);
  const [editSong, setEditSong] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  const successTimer = useRef(null);
  const searchInputRef = useRef(null);

  const [profile, setProfile] = useState({
    adminName: localStorage.getItem('admin_name') || 'Azad Hossain',
    adminEmail: localStorage.getItem('admin_email') || 'admin@azaad.com',
    adminPhoto: localStorage.getItem('admin_photo') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Azad',
    bio: localStorage.getItem('admin_bio') || 'Music Producer & Content Creator',
  });

  const [previews, setPreviews] = useState({ audio: '', cover: '', avatar: '' });

  const showSuccess = (message, timeout = 2500) => {
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
      setError(err.message || 'Server connection failed.');
    } finally {
      setInitLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { fetchSongs(); }, [fetchSongs]);
  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === '/' && view === 'library' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
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
        setError('Invalid API key.');
        return;
      }
      localStorage.setItem('azaad_api_key', apiKey.trim());
      setApiKey(apiKey.trim());
      setIsLoggedIn(true);
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('azaad_api_key');
    setApiKey('');
    setIsLoggedIn(false);
    setSongs([]);
    setCurrentSong(null);
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
      setProfile((prev) => ({ ...prev, adminPhoto: url }));
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
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      e.target.reset();
      setPreviews((prev) => ({ ...prev, audio: '', cover: '' }));
      await fetchSongs();
      setView('library');
      showSuccess('Track uploaded successfully!');
    } catch (err) {
      setError(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  };

  const deleteTrack = async (id) => {
    if (!window.confirm('Delete this track permanently?')) return;
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': apiKey },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Delete failed.');
      }
      setSongs((prev) => prev.filter((s) => s.id !== id));
      if (currentSong?.id === id) setCurrentSong(null);
      showSuccess('Track deleted.');
    } catch (err) {
      setError(err.message || 'Delete failed.');
    }
  };

  const handleEditSave = async (id, form) => {
    setEditLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      const updated = normalizeSong(data, 0);
      setSongs((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (currentSong?.id === id) setCurrentSong(updated);
      setEditSong(null);
      showSuccess('Track updated.');
    } catch (err) {
      setError(err.message || 'Update failed.');
    } finally {
      setEditLoading(false);
    }
  };

  const updateProfile = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = {
      ...profile,
      adminName: String(fd.get('adminName') || '').trim(),
      adminEmail: String(fd.get('adminEmail') || '').trim(),
      bio: String(fd.get('bio') || '').trim(),
    };
    setProfile(updated);
    localStorage.setItem('admin_name', updated.adminName);
    localStorage.setItem('admin_email', updated.adminEmail);
    localStorage.setItem('admin_bio', updated.bio);
    showSuccess('Profile saved.');
  };

  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return songs;
    return songs.filter((song) =>
      [song.title, song.artist, song.category, song.genre, song.singers, song.type, song.vibe]
        .some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [songs, searchQuery]);

  const playSong = (song) => {
    if (currentSong?.id === song.id) {
      setCurrentSong(null);
    } else {
      setCurrentSong(song);
    }
  };

  const navItems = [
    { id: 'library', label: 'Library', icon: Library },
    { id: 'upload', label: 'Upload Track', icon: Upload },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors';

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="Azaad" className="w-20 h-20 rounded-2xl mx-auto mb-4 object-contain" />
            <h1 className="text-2xl font-bold text-white tracking-tight">AZAAD MUSIC</h1>
            <p className="text-sm text-neutral-500 mt-1">Admin Dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <ShieldCheck className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                required
                placeholder="Enter API Key"
                className="w-full pl-11 pr-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            <button
              disabled={loading}
              className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Main App Layout ──────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen bg-[#050507] text-neutral-200 flex ${currentSong ? 'pb-20' : ''}`}>

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 z-40 h-screen w-64 flex flex-col bg-[#0a0a0c] border-r border-white/[0.06] transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="pt-6 pb-4 flex justify-center">
          <img src={LOGO_URL} alt="Azaad" className="w-10 h-10 rounded-xl object-contain" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-600 px-3 mb-2">Menu</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setView(id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                view === id
                  ? 'bg-indigo-600/15 text-indigo-400 font-semibold'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>

        {/* Profile quick + logout */}
        <div className="px-3 pb-4 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <img src={profile.adminPhoto} alt={profile.adminName} className="w-8 h-8 rounded-full object-cover border border-white/10" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-white truncate">{profile.adminName}</p>
              <p className="text-[10px] text-neutral-500 truncate">{profile.adminEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden" />}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[#050507]/80 backdrop-blur-xl border-b border-white/[0.06] px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/10 text-neutral-400">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-white">{navItems.find((n) => n.id === view)?.label || 'Library'}</h2>
          </div>
          <button onClick={fetchSongs} className="p-2 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${initLoading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        {/* Notifications */}
        <div className="px-6 pt-4 space-y-2">
          {success && (
            <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {success}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              <button onClick={() => setError('')} className="ml-auto p-1 hover:bg-white/10 rounded"><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>

        <div className="p-6">
          {/* ─── Library View ──────────────────────────────────────────── */}
          {view === 'library' && (
            <div className="space-y-5">
              {/* Search + controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tracks..."
                    className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-600 bg-white/5 px-1.5 py-0.5 rounded">/</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`} title="Grid view">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-white hover:bg-white/5'}`} title="List view">
                    <List className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-neutral-600 ml-2">{filteredSongs.length} tracks</span>
                </div>
              </div>

              {/* Song list */}
              {initLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="text-center py-20 rounded-2xl border border-dashed border-white/10">
                  <Music2 className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                  <p className="text-neutral-500 mb-4">{searchQuery ? 'No matching tracks found.' : 'Your library is empty.'}</p>
                  {!searchQuery && (
                    <button
                      onClick={() => setView('upload')}
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Upload your first track
                    </button>
                  )}
                </div>
              ) : viewMode === 'list' ? (
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] divide-y divide-white/[0.04]">
                  {filteredSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isPlaying={currentSong?.id === song.id}
                      onPlay={playSong}
                      onEdit={setEditSong}
                      onDelete={deleteTrack}
                      viewMode="list"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredSongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isPlaying={currentSong?.id === song.id}
                      onPlay={playSong}
                      onEdit={setEditSong}
                      onDelete={deleteTrack}
                      viewMode="grid"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Upload Track View ────────────────────────────────────── */}
          {view === 'upload' && (
            <form onSubmit={handleAddTrack} className="max-w-2xl mx-auto space-y-6">
              <div className="text-center mb-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-indigo-400" />
                </div>
                <p className="text-sm text-neutral-500">Add a new track to your library</p>
              </div>

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">Title *</label>
                    <input name="title" required placeholder="Song title" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">Artist *</label>
                    <input name="artist" required placeholder="Primary artist" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">Singer(s)</label>
                    <input name="singers" placeholder="Featured singers" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">Category</label>
                    <select name="category" defaultValue="Other" className={inputClass}>
                      {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">Genre</label>
                    <input name="genre" placeholder="e.g. Pop, Rock" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-400 mb-1.5 block">Type</label>
                    <input name="type" placeholder="e.g. Single, Album" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-neutral-400 mb-1.5 block">Vibe</label>
                    <input name="vibe" placeholder="e.g. Chill, Energetic" className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="group relative h-40 rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-indigo-500/5 transition-all">
                  {previews.audio ? (
                    <div className="text-center">
                      <Music2 className="w-6 h-6 text-indigo-400 mx-auto mb-1" />
                      <span className="text-xs text-indigo-400 font-medium">Audio ready</span>
                    </div>
                  ) : (
                    <>
                      <Music2 className="w-6 h-6 text-neutral-500 group-hover:text-indigo-400 transition-colors" />
                      <span className="text-xs text-neutral-500 group-hover:text-indigo-400 transition-colors">Upload audio file *</span>
                      <span className="text-[10px] text-neutral-600">MP3, WAV, OGG up to 100MB</span>
                    </>
                  )}
                  <input type="file" name="audio" accept="audio/*" onChange={(e) => handleFilePreview(e, 'audio')} className="hidden" required />
                </label>

                <label className="group relative h-40 rounded-2xl border-2 border-dashed border-white/10 hover:border-indigo-500/40 flex flex-col items-center justify-center gap-2 cursor-pointer bg-white/[0.02] hover:bg-indigo-500/5 transition-all overflow-hidden">
                  {previews.cover ? (
                    <img src={previews.cover} alt="cover preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-neutral-500 group-hover:text-indigo-400 transition-colors" />
                      <span className="text-xs text-neutral-500 group-hover:text-indigo-400 transition-colors">Upload cover art *</span>
                      <span className="text-[10px] text-neutral-600">JPG, PNG up to 15MB</span>
                    </>
                  )}
                  <input type="file" name="cover" accept="image/*" onChange={(e) => handleFilePreview(e, 'cover')} className="hidden" required />
                </label>
              </div>

              <div className="flex gap-6 text-sm px-1">
                <label className="flex items-center gap-2 text-neutral-400 cursor-pointer">
                  <input type="checkbox" name="featured" className="accent-indigo-500 w-4 h-4" /> Featured
                </label>
                <label className="flex items-center gap-2 text-neutral-400 cursor-pointer">
                  <input type="checkbox" name="trending" className="accent-indigo-500 w-4 h-4" /> Trending
                </label>
              </div>

              <button
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {loading ? 'Uploading...' : 'Publish Track'}
              </button>
            </form>
          )}

          {/* ─── Profile View ─────────────────────────────────────────── */}
          {view === 'profile' && (
            <form onSubmit={updateProfile} className="max-w-xl mx-auto space-y-6">
              {/* Avatar card */}
              <div className="bg-gradient-to-br from-indigo-600/20 via-purple-600/10 to-transparent border border-white/[0.06] rounded-2xl p-8 text-center">
                <label className="relative cursor-pointer group inline-block">
                  <img src={profile.adminPhoto} alt={profile.adminName} className="w-28 h-28 rounded-full object-cover border-4 border-indigo-500/30 mx-auto" />
                  <span className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </span>
                  <input type="file" accept="image/*" onChange={(e) => handleFilePreview(e, 'avatar')} className="hidden" />
                </label>
                <h3 className="mt-4 text-xl font-bold text-white">{profile.adminName}</h3>
                <p className="text-sm text-neutral-400">{profile.bio}</p>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-neutral-400">
                  <Music2 className="w-3 h-3" /> {songs.length} tracks in library
                </div>
              </div>

              {/* Form fields */}
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input name="adminName" defaultValue={profile.adminName} required className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input name="adminEmail" defaultValue={profile.adminEmail} required className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1.5 flex items-center gap-1.5">
                    <PenLine className="w-3 h-3" /> Bio
                  </label>
                  <textarea name="bio" defaultValue={profile.bio} rows={3} className={`${inputClass} resize-none`} />
                </div>
              </div>

              <button className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center gap-2 transition-colors">
                <Save className="w-4 h-4" /> Save Profile
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Edit Modal */}
      {editSong && (
        <EditModal
          song={editSong}
          onClose={() => setEditSong(null)}
          onSave={handleEditSave}
          loading={editLoading}
        />
      )}

      {/* Audio Player Bar */}
      {currentSong && (
        <PlayerBar
          song={currentSong}
          songs={songs}
          onChangeSong={setCurrentSong}
        />
      )}
    </div>
  );
}
