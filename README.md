# Azaad Backend API + Frontend Admin Options

This repository includes two frontend options:

1. **Built-in upload page** served by Express at `http://localhost:5000/`
2. **Advanced React admin dashboard** in `frontend/`

## Backend API
- `GET /api`
- `GET /api/songs`
- `POST /api/songs` (requires `x-api-key`)
- `DELETE /api/songs/:id` (requires `x-api-key`)
- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `POST /api/login` (admin username/password OR Supabase email/password)
- `GET /api/profile-view` (requires `Authorization: Bearer <access_token>`)
- `PUT /api/profile` (requires `Authorization: Bearer <access_token>`)
- `POST /api/profile/avatar` (multipart/form-data, requires `Authorization: Bearer <access_token>`)

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


## Supabase setup
1. Copy `.env.example` to `.env` and add your Supabase values.
2. Install server dependencies including Supabase SDK: `npm install @supabase/supabase-js dotenv`.
3. Run `supabase/schema.sql` in Supabase SQL editor to create the `profiles` table and policies.
4. In Supabase Auth, enable Email/Password provider.
5. Send the returned `accessToken` from `/api/auth/signin` as `Authorization: Bearer <token>` when calling profile endpoints.
6. You can also sign in via `POST /api/login` using `{ "email": "...", "password": "..." }` (or put the email in `username` for legacy clients).

### Notes
- `profile-view` always returns the user email from Supabase Auth (`auth.users`) so your profile screen can show email directly from Supabase.
- Avatar uploads are stored in Supabase Storage bucket `avatars` and the public URL is saved in `profiles.avatar_url`.
