# Azaad Backend API + Frontend Admin Options

This repository includes two frontend options:

1. **Built-in upload page** served by Express at `http://localhost:5000/`
2. **Advanced React admin dashboard** in `frontend/`

## Backend API
- `GET /api`
- `GET /api/songs`
- `POST /api/songs` (requires `x-api-key`)
- `DELETE /api/songs/:id` (requires `x-api-key`)

Uploads are stored in `uploads/` and song metadata is stored in `data/songs.json`.

## Run backend
```bash
npm install
npm start
```

Backend default URL: `http://localhost:5000`

## Built-in upload UI (simple)
Open:
- `http://localhost:5000/`

This page supports uploading song audio + cover image and previewing uploaded items.

## React dashboard (advanced)

### Design reference
The advanced dashboard styling is aligned to: `https://azzad-music-site-ruby.vercel.app/`.
The React version lives in:
- `frontend/src/App.jsx`

Features:
- API key login/logout
- searchable music dashboard
- add-track upload with audio/image preview and validation
- delete track from library
- profile/branding settings persisted to localStorage

### Run React dashboard locally
```bash
cd frontend
npm install
npm run dev
```

Then open:
- `http://localhost:5173`

### Optional frontend environment variables
Create `frontend/.env` if needed:
```bash
VITE_API_BASE=http://localhost:5000/api/songs
VITE_MAIN_SITE_URL=https://azzad-music-site-ruby.vercel.app

# On deployed backend (example: https://azaad-backend-api.onrender.com/)
# you can skip VITE_API_BASE and it will automatically use current origin + /api/songs.
```

## API key
Set environment variable:
```bash
ADMIN_API_KEY=163087
ADMIN_USERNAME=mahin
ADMIN_PASSWORD=mahin@2026*
AWS_REGION=ap-southeast-1
```

If not set, backend defaults to:
- API key: `163087`
- username: `mahin`
- password: `mahin@2026*`

If you send `s3://bucket/key` in `audioUrl` or `coverUrl`, the API now normalizes it to a browser-friendly HTTPS URL. Set `AWS_REGION` (or `S3_REGION`) so generated URLs use the correct regional endpoint.
