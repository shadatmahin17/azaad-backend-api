const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const loginErrorEl = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');

const statusEl = document.getElementById('status');
const statusText = document.getElementById('statusText');
const statusTime = document.getElementById('statusTime');
const refreshButton = document.getElementById('refreshButton');
const searchInput = document.getElementById('searchInput');
const globalSearchInput = document.getElementById('globalSearchInput');
const countBadge = document.getElementById('countBadge');
const songList = document.getElementById('songList');
const uploadForm = document.getElementById('uploadForm');
const submitUpload = document.getElementById('submitUpload');
const profileForm = document.getElementById('profileForm');
const overviewView = document.getElementById('overviewView');
const totalSongsStat = document.getElementById('totalSongsStat');
const featuredSongsStat = document.getElementById('featuredSongsStat');
const trendingSongsStat = document.getElementById('trendingSongsStat');
const categoryCountStat = document.getElementById('categoryCountStat');
const monthlyStats = document.getElementById('monthlyStats');
const categoryStats = document.getElementById('categoryStats');

const views = {
  library: document.getElementById('libraryView'),
  upload: document.getElementById('uploadView'),
  profile: document.getElementById('profileView')
};

const headerTitle = document.getElementById('headerTitle');
const headerSubtitle = document.getElementById('headerSubtitle');
const navButtons = [...document.querySelectorAll('.nav-btn')];

const siteNameEl = document.getElementById('siteName');
const logoContainer = document.getElementById('logoContainer');
const headerAdminName = document.getElementById('headerAdminName');
const headerAdminEmail = document.getElementById('headerAdminEmail');
const headerAvatar = document.getElementById('headerAvatar');
const profileAvatarPreview = document.getElementById('profileAvatarPreview');
const avatarUploadInput = document.getElementById('avatarUploadInput');
const removeAvatarBtn = document.getElementById('removeAvatarBtn');
const siteNameDisplay = document.getElementById('siteNameDisplay');
const headerTrackCount = document.getElementById('headerTrackCount');
const headerCategoryCount = document.getElementById('headerCategoryCount');

const MAIN_LOGO_SOURCE = '/img/Black-Logo.png';
function normalizeS3Url(url) {
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
}

function mediaUrl(url) {
  if (!url || typeof url !== 'string') return url;
  const normalized = normalizeS3Url(url);
  return normalized.startsWith('/uploads/') ? `${window.location.origin}${normalized}` : normalized;
}

const DEFAULT_BRANDING = {
  siteName: 'AZAAD MUSIC',
  logoText: 'AZA',
  logoImage: MAIN_LOGO_SOURCE,
  adminName: 'Admin User',
  adminEmail: 'admin@azaad.com',
  adminPhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Azaad-Admin',
  bio: 'Music dashboard admin'
};

let songs = [];

function firstNonEmptyString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function normalizeSong(song = {}, index = 0) {
  return {
    ...song,
    id: firstNonEmptyString(song.id, song._id, song.songId) || `song-${index}-${firstNonEmptyString(song.title, song.name, song.trackName) || 'untitled'}`,
    title: firstNonEmptyString(song.title, song.name, song.trackName, song.songName) || 'Untitled',
    artist: firstNonEmptyString(song.artist, song.singer, song.singers, song.author) || 'Unknown',
    singers: firstNonEmptyString(song.singers, song.singer, song.artist),
    category: firstNonEmptyString(song.category, song.language, song.genreCategory) || 'Other',
    coverUrl: firstNonEmptyString(song.coverUrl, song.cover, song.coverImage, song.image, song.thumbnail, song.artwork),
    audioUrl: firstNonEmptyString(song.audioUrl, song.audio, song.songUrl, song.trackUrl, song.url, song.src)
  };
}

function renderOverview() {
  if (!totalSongsStat) return;
  totalSongsStat.textContent = String(songs.length);
  featuredSongsStat.textContent = String(songs.filter((song) => Boolean(song.featured)).length);
  trendingSongsStat.textContent = String(songs.filter((song) => Boolean(song.trending)).length);

  const categoryMap = songs.reduce((acc, song) => {
    const key = String(song.category || 'Other').trim() || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categoryEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
  categoryCountStat.textContent = String(categoryEntries.length);

  const monthMap = {};
  songs.forEach((song) => {
    const date = song.createdAt ? new Date(song.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return;
    const month = date.toLocaleString('en-US', { month: 'short' });
    monthMap[month] = (monthMap[month] || 0) + 1;
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthEntries = months.map((month) => [month, monthMap[month] || 0]);
  const maxMonthValue = Math.max(1, ...monthEntries.map(([, value]) => value));
  monthlyStats.innerHTML = monthEntries
    .map(([label, value]) => `
      <div class="bar-item">
        <div class="bar-track">
          <div class="bar-fill" style="height:${Math.max(6, (value / maxMonthValue) * 100)}%"></div>
        </div>
        <span>${label}</span>
      </div>
    `)
    .join('');

  categoryStats.innerHTML = categoryEntries.length
    ? categoryEntries.slice(0, 6).map(([name, value]) => `<li><span>${escapeHtml(name)}</span><strong>${value}</strong></li>`).join('')
    : '<li><span>No categories yet</span><strong>0</strong></li>';
}

function getApiKey() {
  return localStorage.getItem('azaad_api_key') || '';
}

function setLoginError(message = '') {
  if (!loginErrorEl) return;
  if (!message) {
    loginErrorEl.textContent = '';
    loginErrorEl.classList.add('hidden');
    return;
  }
  loginErrorEl.textContent = message;
  loginErrorEl.classList.remove('hidden');
}

async function validateApiKey(key) {
  const response = await fetch('/api/auth-check', {
    headers: { 'x-api-key': key }
  });
  return response.ok;
}

async function loginWithCredentials(username, password) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Login failed');
  }
  return data;
}

function getBranding() {
  return {
    siteName: localStorage.getItem('site_name') || DEFAULT_BRANDING.siteName,
    logoText: localStorage.getItem('logo_text') || DEFAULT_BRANDING.logoText,
    logoImage: DEFAULT_BRANDING.logoImage,
    adminName: localStorage.getItem('admin_name') || DEFAULT_BRANDING.adminName,
    adminEmail: localStorage.getItem('admin_email') || DEFAULT_BRANDING.adminEmail,
    adminPhoto: localStorage.getItem('admin_photo') || DEFAULT_BRANDING.adminPhoto,
    bio: localStorage.getItem('admin_bio') || DEFAULT_BRANDING.bio
  };
}

function getLogoFallbackText(branding) {
  const saved = (branding.logoText || '').trim();
  if (saved) return saved.slice(0, 4).toUpperCase();

  const words = String(branding.siteName || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return DEFAULT_BRANDING.logoText.slice(0, 4).toUpperCase();

  return words.map((word) => word[0]).join('').slice(0, 4).toUpperCase();
}

function updateSidebarLogo() {
  const branding = getBranding();
  const logoFallback = getLogoFallbackText(branding);
  if (branding.logoImage && branding.logoImage.trim() !== '') {
    logoContainer.innerHTML = `<img src="${mediaUrl(branding.logoImage)}" alt="logo" onerror="this.onerror=null; this.parentElement.innerHTML='<span>${logoFallback}</span>';" />`;
  } else {
    logoContainer.innerHTML = `<span>${logoFallback}</span>`;
  }
}

function applyBrandingToUI() {
  const branding = getBranding();
  siteNameEl.textContent = branding.siteName;
  if (siteNameDisplay) siteNameDisplay.textContent = `${branding.siteName} Dashboard`;
  updateSidebarLogo();
  headerAdminName.textContent = branding.adminName;
  headerAdminEmail.textContent = branding.adminEmail;
  headerAvatar.src = branding.adminPhoto;
  profileAvatarPreview.src = branding.adminPhoto;

  profileForm.siteName.value = branding.siteName;
  profileForm.logoImage.value = branding.logoImage || '';
  profileForm.adminName.value = branding.adminName;
  profileForm.adminEmail.value = branding.adminEmail;
  profileForm.adminPhoto.value = branding.adminPhoto;
  profileForm.bio.value = branding.bio;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
}

function setStatus(message, type = 'info') {
  const icon = type === 'ok' ? '<i class="fas fa-check-circle"></i>' : (type === 'error' ? '<i class="fas fa-exclamation-triangle"></i>' : '<i class="fas fa-info-circle"></i>');
  if (statusText) {
    statusEl.innerHTML = `${icon} <span id="statusText"></span><small id="statusTime"></small>`;
    document.getElementById('statusText').textContent = message;
    document.getElementById('statusTime').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    statusEl.innerHTML = `${icon} ${message}`;
  }
  statusEl.classList.remove('ok', 'error');
  if (type === 'ok') statusEl.classList.add('ok');
  if (type === 'error') statusEl.classList.add('error');
}

function setAuthView(isLoggedIn) {
  loginView.classList.toggle('hidden', isLoggedIn);
  dashboardView.classList.toggle('hidden', !isLoggedIn);
}

function switchView(target) {
  Object.entries(views).forEach(([key, element]) => {
    element.classList.toggle('hidden', key !== target);
  });
  if (overviewView) {
    overviewView.classList.toggle('hidden', target !== 'library');
  }

  navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.view === target);
  });

  const map = {
    library: ['Dashboard', 'Plan, prioritize, and accomplish your tasks with ease.'],
    upload: ['<i class="fas fa-cloud-upload-alt"></i> Upload Track', 'Create and publish a new song'],
    profile: ['<i class="fas fa-user-cog"></i> Profile Settings', 'Edit dashboard branding and admin profile']
  };

  headerTitle.innerHTML = map[target][0];
  headerSubtitle.textContent = map[target][1];
}

function renderSongs(filteredSongs) {
  songList.innerHTML = '';

  if (!filteredSongs.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.innerHTML = '<i class="fas fa-music"></i> No tracks found.';
    songList.appendChild(li);
    return;
  }

  filteredSongs.forEach((song) => {
    const li = document.createElement('li');
    const singerNames = song.singers || song.artist || 'Unknown';
    const categoryLine = [song.category || 'Other', song.genre].filter(Boolean).join(' • ');
    const metaLine = [song.type, song.vibe].filter(Boolean).join(' • ');
    const cover = mediaUrl(song.coverUrl);
    const audio = mediaUrl(song.audioUrl);
    li.innerHTML = `
      <div class="song-meta">
        ${cover
          ? `<img src="${cover}" alt="${song.title}" />`
          : '<div class="song-cover-fallback"><i class="fas fa-image"></i></div>'}
        <div>
          <strong>${escapeHtml(song.title)}</strong>
          <small>${escapeHtml(singerNames)} • ${escapeHtml(categoryLine || 'Other')}</small>
          ${metaLine ? `<small>${escapeHtml(metaLine)}</small>` : ''}
        </div>
      </div>
      <div class="song-actions">
        ${audio
          ? `<a href="${audio}" target="_blank" rel="noopener"><i class="fas fa-play"></i> Play</a>`
          : '<span class="song-missing-audio"><i class="fas fa-ban"></i> No audio</span>'}
        <button type="button" class="secondary song-edit-btn" data-id="${song.id}"><i class="fas fa-pen"></i> Edit</button>
        <button type="button" class="danger song-delete-btn" data-id="${song.id}"><i class="fas fa-trash"></i> Delete</button>
      </div>
    `;
    songList.appendChild(li);
  });
}

async function deleteSong(songId) {
  const target = songs.find((song) => song.id === songId);
  if (!target) return;
  const shouldDelete = window.confirm(`Delete "${target.title}" by ${target.artist}?`);
  if (!shouldDelete) return;

  try {
    const response = await fetch(`/api/songs/${songId}`, {
      method: 'DELETE',
      headers: { 'x-api-key': getApiKey() }
    });
    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem('azaad_api_key');
      setAuthView(false);
      throw new Error('Unauthorized: API key expired or invalid. Please sign in again.');
    }
    if (!response.ok) throw new Error(data.error || 'Delete failed');

    setStatus(`Deleted: ${target.title}`, 'ok');
    await loadSongs();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

async function editSong(songId) {
  const target = songs.find((song) => song.id === songId);
  if (!target) return;

  const newTitle = window.prompt('Edit title', target.title);
  if (newTitle === null) return;
  const newArtist = window.prompt('Edit artist', target.artist);
  if (newArtist === null) return;
  const newCategory = window.prompt('Edit category', target.category || 'General');
  if (newCategory === null) return;

  try {
    const response = await fetch(`/api/songs/${songId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getApiKey()
      },
      body: JSON.stringify({
        title: newTitle.trim(),
        artist: newArtist.trim(),
        category: newCategory.trim() || 'General'
      })
    });
    const data = await response.json();

    if (response.status === 401) {
      localStorage.removeItem('azaad_api_key');
      setAuthView(false);
      throw new Error('Unauthorized: API key expired or invalid. Please sign in again.');
    }
    if (!response.ok) throw new Error(data.error || 'Update failed');

    setStatus(`Updated: ${data.title}`, 'ok');
    await loadSongs();
  } catch (error) {
    setStatus(error.message, 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function (m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function applySearch() {
  const q = (searchInput.value || globalSearchInput?.value || '').trim().toLowerCase();
  const filtered = songs.filter((song) =>
    [song.title, song.name, song.trackName]
      .some((v) => String(v || '').toLowerCase().includes(q))
  );
  renderSongs(filtered);
}

function syncSearchInputs(sourceInput) {
  const value = sourceInput?.value || '';
  if (searchInput && sourceInput !== searchInput) searchInput.value = value;
  if (globalSearchInput && sourceInput !== globalSearchInput) globalSearchInput.value = value;
}

async function loadSongs() {
  try {
    refreshButton.disabled = true;
    const response = await fetch('/api/songs');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    songs = Array.isArray(data) ? data.map((song, index) => normalizeSong(song, index)) : [];
    const uniqueCategories = new Set(songs.map((song) => String(song.category || 'Other')));
    countBadge.innerHTML = `<i class="fas fa-headphones"></i> ${songs.length} track${songs.length !== 1 ? 's' : ''}`;
    if (headerTrackCount) headerTrackCount.innerHTML = `<i class="fas fa-headphones"></i> ${songs.length} Tracks`;
    if (headerCategoryCount) headerCategoryCount.innerHTML = `<i class="fas fa-layer-group"></i> ${uniqueCategories.size} Categories`;
    renderOverview();
    applySearch();
  } catch (error) {
    setStatus(`Failed to load songs: ${error.message}`, 'error');
  } finally {
    refreshButton.disabled = false;
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) return;
  setLoginError('');

  try {
    const loginData = await loginWithCredentials(username, password);
    const key = String(loginData.apiKey || '').trim();
    if (!key) throw new Error('No API key was returned by the server.');

    localStorage.setItem('azaad_api_key', key);
    localStorage.setItem('azaad_admin_username', username);
    setAuthView(true);
    loginForm.reset();
    setLoginError('');
    setStatus('Logged in successfully.', 'ok');
    applyBrandingToUI();
    loadSongs();
  } catch (error) {
    setLoginError(`Login failed: ${error.message}`);
    setStatus(`Login failed: ${error.message}`, 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('azaad_api_key');
  localStorage.removeItem('azaad_admin_username');
  setAuthView(false);
  setLoginError('');
  setStatus('Logged out.', 'ok');
});

navButtons.forEach((button) => {
  button.addEventListener('click', () => switchView(button.dataset.view));
});

searchInput.addEventListener('input', () => {
  syncSearchInputs(searchInput);
  applySearch();
});

if (globalSearchInput) {
  globalSearchInput.addEventListener('input', () => {
    syncSearchInputs(globalSearchInput);
    applySearch();
  });
}
refreshButton.addEventListener('click', loadSongs);
songList.addEventListener('click', async (event) => {
  const editBtn = event.target.closest('.song-edit-btn');
  if (editBtn) {
    await editSong(editBtn.dataset.id);
    return;
  }

  const deleteBtn = event.target.closest('.song-delete-btn');
  if (deleteBtn) {
    await deleteSong(deleteBtn.dataset.id);
  }
});

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('Uploading...', 'info');
  submitUpload.disabled = true;

  const fields = new FormData(uploadForm);
  const audioFile = fields.get('audio');
  const coverFile = fields.get('cover');
  const audioUrl = String(fields.get('audioUrl') || '').trim();
  const coverUrl = String(fields.get('coverUrl') || '').trim();

  const hasAudioFile = audioFile && audioFile.size > 0;
  const hasCoverFile = coverFile && coverFile.size > 0;

  if (!hasAudioFile && !audioUrl) {
    setStatus('Please provide either an audio file or an audio URL.', 'error');
    submitUpload.disabled = false;
    return;
  }

  if (!hasCoverFile && !coverUrl) {
    setStatus('Please provide either a cover file or a cover URL.', 'error');
    submitUpload.disabled = false;
    return;
  }

  const payload = new FormData();
  payload.append('title', fields.get('title'));
  payload.append('artist', fields.get('artist'));
  payload.append('category', fields.get('category') || 'Other');
  payload.append('singers', String(fields.get('singers') || '').trim());
  payload.append('genre', String(fields.get('genre') || '').trim());
  const songAgeType = fields.get('newSong')
    ? 'New song'
    : fields.get('oldSong')
      ? 'Old song'
      : '';
  payload.append('type', songAgeType);
  payload.append('vibe', String(fields.get('vibe') || '').trim());
  payload.append('featured', fields.get('featured') ? 'true' : 'false');
  payload.append('trending', fields.get('trending') ? 'true' : 'false');
  if (hasAudioFile) payload.append('audio', audioFile);
  if (hasCoverFile) payload.append('cover', coverFile);
  if (audioUrl) payload.append('audioUrl', audioUrl);
  if (coverUrl) payload.append('coverUrl', coverUrl);

  try {
    const response = await fetch('/api/songs', {
      method: 'POST',
      headers: { 'x-api-key': getApiKey() },
      body: payload
    });

    const data = await response.json();
    if (response.status === 401) {
      localStorage.removeItem('azaad_api_key');
      setAuthView(false);
      throw new Error('Unauthorized: API key expired or invalid. Please sign in again.');
    }
    if (!response.ok) throw new Error(data.error || 'Upload failed');

    setStatus(`Uploaded: ${data.title}`, 'ok');
    uploadForm.reset();
    switchView('library');
    await loadSongs();
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    submitUpload.disabled = false;
  }
});

profileForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const fields = new FormData(profileForm);
  const avatarValue = String(fields.get('adminPhoto') || '').trim();

  localStorage.setItem('site_name', fields.get('siteName'));
  localStorage.setItem('logo_image', MAIN_LOGO_SOURCE);
  localStorage.setItem('admin_name', fields.get('adminName'));
  localStorage.setItem('admin_email', fields.get('adminEmail'));
  localStorage.setItem('admin_photo', avatarValue || DEFAULT_BRANDING.adminPhoto);
  localStorage.setItem('admin_bio', fields.get('bio'));

  applyBrandingToUI();
  setStatus('Profile settings saved.', 'ok');
});

avatarUploadInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    setStatus('Please choose a valid image file for the avatar.', 'error');
    return;
  }

  try {
    const base64Image = await readFileAsDataUrl(file);
    profileForm.adminPhoto.value = base64Image;
    localStorage.setItem('admin_photo', base64Image);
    applyBrandingToUI();
    setStatus('Avatar uploaded and saved to localStorage.', 'ok');
  } catch (error) {
    setStatus(error.message, 'error');
  } finally {
    event.target.value = '';
  }
});

removeAvatarBtn?.addEventListener('click', () => {
  profileForm.adminPhoto.value = DEFAULT_BRANDING.adminPhoto;
  localStorage.setItem('admin_photo', DEFAULT_BRANDING.adminPhoto);
  applyBrandingToUI();
  setStatus('Avatar reset to default.', 'ok');
});

async function init() {
  const key = getApiKey();
  let loggedIn = Boolean(key);

  if (loggedIn) {
    try {
      const isValid = await validateApiKey(key);
      if (!isValid) {
        localStorage.removeItem('azaad_api_key');
        loggedIn = false;
        setLoginError('Session expired. Please sign in again.');
        setStatus('Session expired. Please sign in with a valid API key.', 'error');
      }
    } catch (error) {
      setLoginError(`Unable to verify session: ${error.message}`);
      setStatus(`Unable to verify session: ${error.message}`, 'error');
    }
  }

  setAuthView(loggedIn);
  switchView('library');
  applyBrandingToUI();
  if (loggedIn) loadSongs();
}

init();
