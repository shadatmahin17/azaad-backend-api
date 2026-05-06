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
  Link,
  Lock,
  Mic2,
  Repeat,
  Shuffle,
  Heart,
  ChevronRight,
} from 'lucide-react';

const DEFAULT_API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api/songs` : 'http://localhost:5000/api/songs';
const API_BASE = import.meta.env.VITE_API_BASE || DEFAULT_API_BASE;
const SERVER_BASE = API_BASE.replace('/api/songs', '');
const LOGO_URL = '/img/Logo.png';
const BLACK_LOGO_URL = '/img/Black-Logo.png';
const BG_URL = 'https://mahin-cloud-storage.s3.ap-southeast-1.amazonaws.com/img/Background.jpg';

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

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-[var(--primary)]/10 text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg glass-card rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-[var(--text)]">Edit Track</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-[var(--text-light)] mb-1 block">Title</label>
              <input name="title" value={form.title} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Artist</label>
              <input name="artist" value={form.artist} onChange={handleChange} required className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Singer(s)</label>
              <input name="singers" value={form.singers} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Genre</label>
              <input name="genre" value={form.genre} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Type</label>
              <input name="type" value={form.type} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className="text-xs text-[var(--text-light)] mb-1 block">Vibe</label>
              <input name="vibe" value={form.vibe} onChange={handleChange} className={inputClass} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--primary)]/20 text-[var(--text-light)] hover:bg-white/5 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-3 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Improved Audio Player Bar ─────────────────────────────────────────────────
function PlayerBar({ song, songs, onChangeSong }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off');
  const [liked, setLiked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const seekBarRef = useRef(null);

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
    if (audioRef.current && !isDragging) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !seekBarRef.current) return;
    const rect = seekBarRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const handleSeekMouseDown = (e) => {
    setIsDragging(true);
    handleSeek(e);
    const onMove = (ev) => handleSeek(ev);
    const onUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
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
    if (isShuffled && songs.length > 1) {
      let next;
      do { next = songs[Math.floor(Math.random() * songs.length)]; } while (next.id === song.id);
      onChangeSong(next);
      return;
    }
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx < songs.length - 1) onChangeSong(songs[idx + 1]);
    else if (songs.length > 0) onChangeSong(songs[0]);
  };

  const playPrev = () => {
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const idx = songs.findIndex((s) => s.id === song.id);
    if (idx > 0) onChangeSong(songs[idx - 1]);
    else if (songs.length > 0) onChangeSong(songs[songs.length - 1]);
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
      return;
    }
    setIsPlaying(false);
    playNext();
  };

  const cycleRepeat = () => {
    setRepeatMode((prev) => prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off');
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 player-glass border-t border-[var(--primary)]/10">
      <audio
        ref={audioRef}
        src={mediaUrl(song.audioUrl)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        loop={repeatMode === 'one'}
      />

      {/* Seek bar */}
      <div
        ref={seekBarRef}
        className="h-1.5 bg-white/5 cursor-pointer group relative"
        onMouseDown={handleSeekMouseDown}
      >
        <div
          className="h-full bg-gradient-to-r from-[var(--primary-dark)] to-[var(--primary)] group-hover:shadow-[0_0_12px_rgba(83,242,224,0.4)] transition-shadow relative"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_8px_rgba(83,242,224,0.5)]" />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 md:px-6 py-3 max-w-screen-2xl mx-auto">
        {/* Track info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <img
              src={mediaUrl(song.coverUrl)}
              alt={song.title}
              className={`w-14 h-14 rounded-xl object-cover border border-[var(--primary)]/20 ${isPlaying ? 'shadow-[0_0_20px_rgba(83,242,224,0.15)]' : ''}`}
            />
            {isPlaying && (
              <div className="absolute -bottom-1 -right-1 flex items-end gap-[2px] bg-[var(--card-bg)] rounded-md px-1 py-0.5">
                <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-1" />
                <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-2" />
                <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-3" />
                <span className="w-[3px] rounded-full bg-[var(--primary)] eq-bar-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--text)] truncate">{song.title}</p>
            <p className="text-xs text-[var(--text-light)] truncate">{song.singers || song.artist}</p>
          </div>
          <button
            onClick={() => setLiked(!liked)}
            className={`p-2 rounded-full transition-colors flex-shrink-0 ${liked ? 'text-red-400' : 'text-[var(--text-light)] hover:text-red-400'}`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center controls */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsShuffled(!isShuffled)}
              className={`p-2 rounded-full transition-colors hidden sm:block ${isShuffled ? 'text-[var(--primary)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={playPrev} className="p-2 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center hover:scale-105 transition-all glow-primary"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <button onClick={playNext} className="p-2 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
              <SkipForward className="w-5 h-5" />
            </button>
            <button
              onClick={cycleRepeat}
              className={`p-2 rounded-full transition-colors hidden sm:block relative ${repeatMode !== 'off' ? 'text-[var(--primary)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'}`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-4 h-4" />
              {repeatMode === 'one' && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold bg-[var(--primary)] text-[var(--bg)] w-3.5 h-3.5 rounded-full flex items-center justify-center">1</span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text-light)]">{formatTime(currentTime)}</span>
            <span className="text-[10px] text-[var(--text-light)]">/</span>
            <span className="text-[10px] text-[var(--text-light)]">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="hidden md:flex items-center gap-2 flex-1 justify-end">
          <button onClick={toggleMute} className="p-2 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-28"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Artist Card ───────────────────────────────────────────────────────────────
function ArtistCard({ artist, songCount, coverUrl, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-3 p-4 rounded-2xl transition-all duration-200 group ${
        isActive
          ? 'glass-card border-[var(--primary)]/30 glow-primary'
          : 'hover:bg-[var(--card-bg)]/60 border border-transparent hover:border-[var(--primary)]/10'
      }`}
    >
      <div className={`relative w-20 h-20 rounded-full overflow-hidden border-2 transition-colors ${isActive ? 'border-[var(--primary)]' : 'border-white/10 group-hover:border-[var(--primary)]/40'}`}>
        {coverUrl ? (
          <img src={mediaUrl(coverUrl)} alt={artist} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[var(--primary-dark)]/30 to-[var(--accent)]/30 flex items-center justify-center">
            <Mic2 className="w-8 h-8 text-[var(--primary)]/60" />
          </div>
        )}
        {isActive && (
          <div className="absolute inset-0 bg-[var(--primary)]/10 flex items-center justify-center">
            <Music2 className="w-5 h-5 text-[var(--primary)]" />
          </div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className={`text-sm font-semibold truncate ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>{artist}</p>
        <p className="text-[11px] text-[var(--text-light)]">{songCount} {songCount === 1 ? 'track' : 'tracks'}</p>
      </div>
    </button>
  );
}

// ─── Song Card ─────────────────────────────────────────────────────────────────
function SongCard({ song, isPlaying, onPlay, onEdit, onDelete, viewMode }) {
  if (viewMode === 'list') {
    return (
      <div className={`group flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 ${isPlaying ? 'bg-[var(--primary)]/5 border border-[var(--primary)]/10' : 'hover:bg-white/5 border border-transparent'}`}>
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img src={mediaUrl(song.coverUrl)} alt={song.title} className="w-full h-full object-cover" />
          <button
            onClick={() => onPlay(song)}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
          </button>
          {isPlaying && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="flex items-end gap-[2px]">
                <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-1" />
                <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-2" />
                <span className="w-[2px] rounded-full bg-[var(--primary)] eq-bar-3" />
              </div>
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isPlaying ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>{song.title}</p>
          <p className="text-xs text-[var(--text-light)] truncate">{song.singers || song.artist}</p>
        </div>
        <span className="text-xs text-[var(--text-light)]/60 hidden sm:block">{song.category || 'Other'}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(song)} className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(song.id)} className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--text-light)] hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative rounded-2xl overflow-hidden glass-card transition-all duration-200 hover:border-[var(--primary)]/20 hover:shadow-lg ${isPlaying ? 'border-[var(--primary)]/20 shadow-[0_0_24px_rgba(83,242,224,0.08)]' : ''}`}>
      <div className="relative aspect-square overflow-hidden">
        <img src={mediaUrl(song.coverUrl)} alt={song.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <button
          onClick={() => onPlay(song)}
          className="absolute bottom-3 right-3 w-11 h-11 rounded-full bg-[var(--primary)] text-[var(--bg)] flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:scale-110 glow-primary"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        {isPlaying && (
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[var(--primary)]/90 text-[10px] font-bold text-[var(--bg)] flex items-center gap-1.5">
            <span className="inline-flex gap-[2px] items-end">
              <span className="w-[3px] rounded-full bg-[var(--bg)] eq-bar-1" />
              <span className="w-[3px] rounded-full bg-[var(--bg)] eq-bar-2" />
              <span className="w-[3px] rounded-full bg-[var(--bg)] eq-bar-3" />
            </span>
            Playing
          </div>
        )}
      </div>
      <div className="p-4">
        <h4 className={`font-semibold truncate text-sm ${isPlaying ? 'text-[var(--primary)]' : 'text-[var(--text)]'}`}>{song.title}</h4>
        <p className="text-xs text-[var(--text-light)] truncate mt-0.5">{song.singers || song.artist}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-[10px] text-[var(--text-light)]/60 uppercase tracking-wider">{song.category || 'Other'}{song.genre ? ` · ${song.genre}` : ''}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onEdit(song)} className="p-1.5 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(song.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-[var(--text-light)] hover:text-red-400 transition-colors" title="Delete">
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
  const [accessToken, setAccessToken] = useState(localStorage.getItem('azaad_access_token') || '');
  const [storedAuthMode, setStoredAuthMode] = useState(localStorage.getItem('azaad_auth_mode') || 'apikey');
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem('azaad_api_key')) || Boolean(localStorage.getItem('azaad_access_token'))
  );
  const [loginMode, setLoginMode] = useState('apikey');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
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

  const [selectedArtist, setSelectedArtist] = useState(null);

  const successTimer = useRef(null);
  const searchInputRef = useRef(null);

  const [profile, setProfile] = useState({
    adminName: localStorage.getItem('admin_name') || 'Azad Hossain',
    adminEmail: localStorage.getItem('admin_email') || 'admin@azaad.com',
    adminPhoto: localStorage.getItem('admin_photo') || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Azad',
    bio: localStorage.getItem('admin_bio') || 'Music Producer & Content Creator',
  });

  const [previews, setPreviews] = useState({ audio: '', cover: '', avatar: '' });

  const [audioUploadMode, setAudioUploadMode] = useState('file');
  const [coverUploadMode, setCoverUploadMode] = useState('file');
  const [audioUrlInput, setAudioUrlInput] = useState('');
  const [coverUrlInput, setCoverUrlInput] = useState('');

  const getAuthHeaders = useCallback(() => {
    const mode = localStorage.getItem('azaad_auth_mode');
    if (mode === 'email') {
      const token = localStorage.getItem('azaad_access_token');
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
    const key = localStorage.getItem('azaad_api_key');
    return key ? { 'x-api-key': key } : {};
  }, []);

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

  // Derive artists from songs
  const artists = useMemo(() => {
    const map = {};
    songs.forEach((song) => {
      const name = song.artist || 'Unknown';
      if (!map[name]) {
        map[name] = { name, count: 0, coverUrl: song.coverUrl };
      }
      map[name].count += 1;
      if (!map[name].coverUrl && song.coverUrl) {
        map[name].coverUrl = song.coverUrl;
      }
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [songs]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (loginMode === 'apikey') {
        if (!apiKey.trim()) return;
        const res = await fetch(`${SERVER_BASE}/api/auth-check`, {
          headers: { 'x-api-key': apiKey.trim() },
        });
        if (!res.ok) { setError('Invalid API key.'); return; }
        localStorage.setItem('azaad_api_key', apiKey.trim());
        localStorage.setItem('azaad_auth_mode', 'apikey');
        setApiKey(apiKey.trim());
        setStoredAuthMode('apikey');
        setIsLoggedIn(true);
      } else {
        if (!loginEmail.trim() || !loginPassword) { setError('Email and password are required.'); return; }
        const res = await fetch(`${SERVER_BASE}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) { setError(data.error || 'Login failed.'); return; }
        localStorage.setItem('azaad_access_token', data.accessToken);
        localStorage.setItem('azaad_auth_mode', 'email');
        if (data.user?.email) {
          localStorage.setItem('admin_email', data.user.email);
          setProfile((prev) => ({ ...prev, adminEmail: data.user.email }));
        }
        setAccessToken(data.accessToken);
        setStoredAuthMode('email');
        setIsLoggedIn(true);
      }
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('azaad_api_key');
    localStorage.removeItem('azaad_access_token');
    localStorage.removeItem('azaad_auth_mode');
    setApiKey('');
    setAccessToken('');
    setStoredAuthMode('apikey');
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

    if (audioUploadMode === 'url') {
      fd.delete('audio');
      if (audioUrlInput.trim()) fd.set('audioUrl', audioUrlInput.trim());
    }
    if (coverUploadMode === 'url') {
      fd.delete('cover');
      if (coverUrlInput.trim()) fd.set('coverUrl', coverUrlInput.trim());
    }

    fd.set('featured', String(e.target.featured.checked));
    fd.set('trending', String(e.target.trending.checked));
    if (!fd.get('category')) fd.set('category', 'Other');
    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      e.target.reset();
      setPreviews((prev) => ({ ...prev, audio: '', cover: '' }));
      setAudioUrlInput('');
      setCoverUrlInput('');
      setAudioUploadMode('file');
      setCoverUploadMode('file');
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
        headers: getAuthHeaders(),
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
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
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
    let list = songs;
    if (selectedArtist) {
      list = list.filter((s) => s.artist === selectedArtist);
    }
    const q = searchQuery.toLowerCase().trim();
    if (!q) return list;
    return list.filter((song) =>
      [song.title, song.artist, song.category, song.genre, song.singers, song.type, song.vibe]
        .some((v) => String(v || '').toLowerCase().includes(q))
    );
  }, [songs, searchQuery, selectedArtist]);

  const playSong = (song) => {
    if (currentSong?.id === song.id) {
      setCurrentSong(null);
    } else {
      setCurrentSong(song);
    }
  };

  const navItems = [
    { id: 'library', label: 'Library', icon: Library },
    { id: 'artists', label: 'Artists', icon: Mic2 },
    { id: 'upload', label: 'Upload Track', icon: Upload },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const inputClass = 'w-full px-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-[var(--primary)]/10 text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors';

  // ─── Login Screen ──────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-[var(--bg)]/80 backdrop-blur-sm" />
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-8">
            <img src={LOGO_URL} alt="Azaad" className="w-20 h-20 rounded-2xl mx-auto mb-4 object-contain shadow-[0_0_30px_rgba(83,242,224,0.2)]" />
            <h1 className="text-2xl font-bold text-[var(--text)] tracking-tight">AZAAD MUSIC</h1>
            <p className="text-sm text-[var(--text-light)] mt-1">Admin Dashboard</p>
          </div>

          {/* Login mode toggle */}
          <div className="flex rounded-xl glass-card p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginMode('apikey'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                loginMode === 'apikey' ? 'bg-[var(--primary-dark)] text-[var(--bg)] glow-primary' : 'text-[var(--text-light)] hover:text-[var(--text)]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> API Key
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('email'); setError(''); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                loginMode === 'email' ? 'bg-[var(--primary-dark)] text-[var(--bg)] glow-primary' : 'text-[var(--text-light)] hover:text-[var(--text)]'
              }`}
            >
              <Mail className="w-4 h-4" /> Email Login
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {loginMode === 'apikey' ? (
              <div className="relative">
                <ShieldCheck className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                  placeholder="Enter API Key"
                  className="w-full pl-11 pr-4 py-4 rounded-xl glass-card text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    placeholder="Email address"
                    className="w-full pl-11 pr-4 py-4 rounded-xl glass-card text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                  />
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    placeholder="Password"
                    className="w-full pl-11 pr-4 py-4 rounded-xl glass-card text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                  />
                </div>
              </>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}
            <button
              disabled={loading}
              className="w-full py-4 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-2 glow-primary"
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
    <div className={`min-h-screen app-bg text-[var(--text)] flex relative ${currentSong ? 'pb-24' : ''}`}>
      <div className="absolute inset-0 bg-[var(--bg)]/75" />

      {/* Sidebar */}
      <aside className={`fixed md:sticky top-0 z-40 h-screen w-64 flex flex-col bg-[var(--sidebar-bg)]/95 backdrop-blur-xl border-r border-[var(--primary)]/8 transition-transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        {/* Logo */}
        <div className="pt-6 pb-4 flex justify-center">
          <img src={LOGO_URL} alt="Azaad" className="w-10 h-10 rounded-xl object-contain" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-2">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-light)]/50 px-3 mb-2">Menu</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setView(id); setIsMobileMenuOpen(false); if (id !== 'library') setSelectedArtist(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 ${
                view === id
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)] font-semibold border border-[var(--primary)]/10'
                  : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}

          {/* Quick artist list in sidebar */}
          {artists.length > 0 && (
            <div className="mt-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-light)]/50 px-3 mb-2">Top Artists</p>
              {artists.slice(0, 5).map((a) => (
                <button
                  key={a.name}
                  onClick={() => { setSelectedArtist(a.name === selectedArtist ? null : a.name); setView('library'); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all mb-0.5 ${
                    selectedArtist === a.name
                      ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                      : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-white/10">
                    {a.coverUrl ? (
                      <img src={mediaUrl(a.coverUrl)} alt={a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-[var(--accent)]/20 flex items-center justify-center">
                        <Mic2 className="w-3 h-3 text-[var(--accent)]" />
                      </div>
                    )}
                  </div>
                  <span className="truncate">{a.name}</span>
                  <span className="text-[10px] text-[var(--text-light)]/50 ml-auto">{a.count}</span>
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Profile quick + logout */}
        <div className="px-3 pb-4 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <img src={profile.adminPhoto} alt={profile.adminName} className="w-8 h-8 rounded-full object-cover border border-[var(--primary)]/20" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-[var(--text)] truncate">{profile.adminName}</p>
              <p className="text-[10px] text-[var(--text-light)] truncate">{profile.adminEmail}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm text-[var(--text-light)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile menu overlay */}
      {isMobileMenuOpen && <div onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 bg-black/60 z-30 md:hidden" />}

      {/* Main content */}
      <main className="flex-1 min-w-0 relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-[var(--bg)]/80 backdrop-blur-xl border-b border-[var(--primary)]/8 px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/10 text-[var(--text-light)]">
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-bold text-[var(--text)]">
              {selectedArtist ? (
                <span className="flex items-center gap-2">
                  <button onClick={() => setSelectedArtist(null)} className="text-[var(--text-light)] hover:text-[var(--text)] transition-colors">Library</button>
                  <ChevronRight className="w-4 h-4 text-[var(--text-light)]" />
                  <span className="text-[var(--primary)]">{selectedArtist}</span>
                </span>
              ) : (
                navItems.find((n) => n.id === view)?.label || 'Library'
              )}
            </h2>
          </div>
          <button onClick={fetchSongs} className="p-2 rounded-lg hover:bg-white/10 text-[var(--text-light)] hover:text-[var(--text)] transition-colors" title="Refresh">
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
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tracks..."
                    className="w-full pl-11 pr-12 py-3 rounded-xl glass-card text-[var(--text)] placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-light)]/50 bg-white/5 px-1.5 py-0.5 rounded">/</span>
                </div>
                <div className="flex items-center gap-2">
                  {selectedArtist && (
                    <button
                      onClick={() => setSelectedArtist(null)}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/25 transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-3 h-3" /> {selectedArtist}
                    </button>
                  )}
                  <button onClick={() => setViewMode('grid')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5'}`} title="Grid view">
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button onClick={() => setViewMode('list')} className={`p-2.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[var(--primary)]/15 text-[var(--primary)]' : 'text-[var(--text-light)] hover:text-[var(--text)] hover:bg-white/5'}`} title="List view">
                    <List className="w-4 h-4" />
                  </button>
                  <span className="text-xs text-[var(--text-light)]/60 ml-2">{filteredSongs.length} tracks</span>
                </div>
              </div>

              {/* Song list */}
              {initLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="text-center py-20 rounded-2xl glass-card">
                  <Music2 className="w-10 h-10 text-[var(--text-light)]/40 mx-auto mb-3" />
                  <p className="text-[var(--text-light)] mb-4">{searchQuery ? 'No matching tracks found.' : selectedArtist ? `No tracks by ${selectedArtist}.` : 'Your library is empty.'}</p>
                  {!searchQuery && !selectedArtist && (
                    <button
                      onClick={() => setView('upload')}
                      className="px-5 py-2.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] text-sm font-semibold inline-flex items-center gap-2 transition-all glow-primary"
                    >
                      <Plus className="w-4 h-4" /> Upload your first track
                    </button>
                  )}
                </div>
              ) : viewMode === 'list' ? (
                <div className="rounded-2xl glass-card divide-y divide-[var(--primary)]/5">
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

          {/* ─── Artists View ──────────────────────────────────────────── */}
          {view === 'artists' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text)]">All Artists</h3>
                  <p className="text-sm text-[var(--text-light)] mt-1">{artists.length} {artists.length === 1 ? 'artist' : 'artists'} in your library</p>
                </div>
              </div>

              {artists.length === 0 ? (
                <div className="text-center py-20 rounded-2xl glass-card">
                  <Mic2 className="w-10 h-10 text-[var(--text-light)]/40 mx-auto mb-3" />
                  <p className="text-[var(--text-light)]">No artists yet. Upload some tracks to see artists here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {artists.map((a) => (
                    <ArtistCard
                      key={a.name}
                      artist={a.name}
                      songCount={a.count}
                      coverUrl={a.coverUrl}
                      isActive={selectedArtist === a.name}
                      onClick={() => {
                        setSelectedArtist(a.name === selectedArtist ? null : a.name);
                        setView('library');
                      }}
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
                <div className="w-14 h-14 rounded-2xl bg-[var(--primary)]/15 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-[var(--primary)]" />
                </div>
                <p className="text-sm text-[var(--text-light)]">Add a new track to your library</p>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-[var(--text-light)] mb-1.5 block">Title *</label>
                    <input name="title" required placeholder="Song title" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-light)] mb-1.5 block">Artist *</label>
                    <input name="artist" required placeholder="Primary artist" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-light)] mb-1.5 block">Singer(s)</label>
                    <input name="singers" placeholder="Featured singers" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-light)] mb-1.5 block">Category</label>
                    <select name="category" defaultValue="Other" className={inputClass}>
                      {CATEGORY_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-light)] mb-1.5 block">Genre</label>
                    <input name="genre" placeholder="e.g. Pop, Rock" className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-light)] mb-1.5 block">Type</label>
                    <input name="type" placeholder="e.g. Single, Album" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-[var(--text-light)] mb-1.5 block">Vibe</label>
                    <input name="vibe" placeholder="e.g. Chill, Energetic" className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {/* Audio source */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[var(--text-light)]">Audio *</label>
                    <div className="flex rounded-lg glass-card p-0.5">
                      <button type="button" onClick={() => setAudioUploadMode('file')} className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${audioUploadMode === 'file' ? 'bg-[var(--primary-dark)] text-[var(--bg)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'}`}>
                        <Upload className="w-3 h-3" /> File
                      </button>
                      <button type="button" onClick={() => setAudioUploadMode('url')} className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${audioUploadMode === 'url' ? 'bg-[var(--primary-dark)] text-[var(--bg)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'}`}>
                        <Link className="w-3 h-3" /> URL
                      </button>
                    </div>
                  </div>
                  {audioUploadMode === 'file' ? (
                    <label className="group relative h-36 rounded-2xl border-2 border-dashed border-[var(--primary)]/15 hover:border-[var(--primary)]/40 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[var(--card-bg)]/40 hover:bg-[var(--primary)]/5 transition-all">
                      {previews.audio ? (
                        <div className="text-center">
                          <Music2 className="w-6 h-6 text-[var(--primary)] mx-auto mb-1" />
                          <span className="text-xs text-[var(--primary)] font-medium">Audio ready</span>
                        </div>
                      ) : (
                        <>
                          <Music2 className="w-6 h-6 text-[var(--text-light)] group-hover:text-[var(--primary)] transition-colors" />
                          <span className="text-xs text-[var(--text-light)] group-hover:text-[var(--primary)] transition-colors">Upload audio file</span>
                          <span className="text-[10px] text-[var(--text-light)]/50">MP3, WAV, OGG up to 100MB</span>
                        </>
                      )}
                      <input type="file" name="audio" accept="audio/*" onChange={(e) => handleFilePreview(e, 'audio')} className="hidden" required />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                        <input
                          type="url"
                          value={audioUrlInput}
                          onChange={(e) => setAudioUrlInput(e.target.value)}
                          required
                          placeholder="https://...s3.amazonaws.com/.../song.mp3"
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass-card text-[var(--text)] text-sm placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-light)]/50 px-1">Paste an S3 or any public audio URL</p>
                    </div>
                  )}
                </div>

                {/* Cover source */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[var(--text-light)]">Cover Art *</label>
                    <div className="flex rounded-lg glass-card p-0.5">
                      <button type="button" onClick={() => setCoverUploadMode('file')} className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${coverUploadMode === 'file' ? 'bg-[var(--primary-dark)] text-[var(--bg)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'}`}>
                        <Upload className="w-3 h-3" /> File
                      </button>
                      <button type="button" onClick={() => setCoverUploadMode('url')} className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all flex items-center gap-1 ${coverUploadMode === 'url' ? 'bg-[var(--primary-dark)] text-[var(--bg)]' : 'text-[var(--text-light)] hover:text-[var(--text)]'}`}>
                        <Link className="w-3 h-3" /> URL
                      </button>
                    </div>
                  </div>
                  {coverUploadMode === 'file' ? (
                    <label className="group relative h-36 rounded-2xl border-2 border-dashed border-[var(--primary)]/15 hover:border-[var(--primary)]/40 flex flex-col items-center justify-center gap-2 cursor-pointer bg-[var(--card-bg)]/40 hover:bg-[var(--primary)]/5 transition-all overflow-hidden">
                      {previews.cover ? (
                        <img src={previews.cover} alt="cover preview" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-6 h-6 text-[var(--text-light)] group-hover:text-[var(--primary)] transition-colors" />
                          <span className="text-xs text-[var(--text-light)] group-hover:text-[var(--primary)] transition-colors">Upload cover art</span>
                          <span className="text-[10px] text-[var(--text-light)]/50">JPG, PNG up to 15MB</span>
                        </>
                      )}
                      <input type="file" name="cover" accept="image/*" onChange={(e) => handleFilePreview(e, 'cover')} className="hidden" required />
                    </label>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-light)]" />
                        <input
                          type="url"
                          value={coverUrlInput}
                          onChange={(e) => setCoverUrlInput(e.target.value)}
                          required
                          placeholder="https://...s3.amazonaws.com/.../cover.png"
                          className="w-full pl-10 pr-4 py-3 rounded-xl glass-card text-[var(--text)] text-sm placeholder-[var(--text-light)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors"
                        />
                      </div>
                      {coverUrlInput.trim() && (
                        <div className="rounded-xl overflow-hidden border border-[var(--primary)]/10 h-20">
                          <img src={coverUrlInput.trim()} alt="Cover preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                        </div>
                      )}
                      <p className="text-[10px] text-[var(--text-light)]/50 px-1">Paste an S3 or any public image URL</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-6 text-sm px-1">
                <label className="flex items-center gap-2 text-[var(--text-light)] cursor-pointer">
                  <input type="checkbox" name="featured" className="accent-[var(--primary)] w-4 h-4" /> Featured
                </label>
                <label className="flex items-center gap-2 text-[var(--text-light)] cursor-pointer">
                  <input type="checkbox" name="trending" className="accent-[var(--primary)] w-4 h-4" /> Trending
                </label>
              </div>

              <button
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all glow-primary"
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
              <div className="bg-gradient-to-br from-[var(--primary-dark)]/20 via-[var(--accent)]/10 to-transparent glass-card rounded-2xl p-8 text-center">
                <label className="relative cursor-pointer group inline-block">
                  <img src={profile.adminPhoto} alt={profile.adminName} className="w-28 h-28 rounded-full object-cover border-4 border-[var(--primary)]/30 mx-auto" />
                  <span className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </span>
                  <input type="file" accept="image/*" onChange={(e) => handleFilePreview(e, 'avatar')} className="hidden" />
                </label>
                <h3 className="mt-4 text-xl font-bold text-[var(--text)]">{profile.adminName}</h3>
                <p className="text-sm text-[var(--text-light)]">{profile.bio}</p>
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/15 text-xs text-[var(--primary)]">
                  <Music2 className="w-3 h-3" /> {songs.length} tracks in library
                </div>
              </div>

              {/* Form fields */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <div>
                  <label className="text-xs text-[var(--text-light)] mb-1.5 flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Full Name
                  </label>
                  <input name="adminName" defaultValue={profile.adminName} required className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-light)] mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3 h-3" /> Email
                  </label>
                  <input name="adminEmail" defaultValue={profile.adminEmail} required className={inputClass} />
                </div>
                <div>
                  <label className="text-xs text-[var(--text-light)] mb-1.5 flex items-center gap-1.5">
                    <PenLine className="w-3 h-3" /> Bio
                  </label>
                  <textarea name="bio" defaultValue={profile.bio} rows={3} className={`${inputClass} resize-none`} />
                </div>
              </div>

              <button className="w-full py-3.5 rounded-xl bg-[var(--primary-dark)] hover:bg-[var(--primary)] text-[var(--bg)] font-bold flex items-center justify-center gap-2 transition-all glow-primary">
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
