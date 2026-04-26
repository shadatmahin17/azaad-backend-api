# Azaad Backend API

Azaad Backend API is an Express-based service for managing songs, admin authentication, and Supabase-backed user profiles.

It powers:
- a React admin dashboard (built with Vite, served from `public/`)
- API-driven integrations for song management and user profiles

## Table of Contents
- [Features](#features)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Storage & Media Behavior](#storage--media-behavior)
- [Security](#security)
- [Development](#development)
- [Deployment](#deployment)
- [License](#license)

## Features

- Song catalog API (list with pagination, create, update, delete)
- File upload support for audio and cover images (Multer)
- URL-based media support (`http(s)` and `s3://...`)
- Admin API key protection for song management routes
- Hybrid authentication:
  - local admin login (`ADMIN_USERNAME` / `ADMIN_PASSWORD`)
  - Supabase email/password login
- Supabase profile endpoints:
  - sign up / sign in
  - profile read/update
  - avatar upload to Supabase Storage
- React admin dashboard (Vite + Tailwind CSS)
- Security hardening (Helmet, CORS, rate limiting)

## Architecture

- **Runtime:** Node.js + Express
- **Data storage:** JSON file (`songs.json`) by default
- **Auth:** API key + optional Supabase Auth
- **Media:** local filesystem uploads, optional S3-style URL normalization
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Security:** Helmet headers, express-rate-limit, configurable CORS

## Requirements

- Node.js 18+
- npm 9+

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy and configure environment variables:

```bash
cp .env.example .env
# Edit .env and set your own ADMIN_API_KEY, ADMIN_USERNAME, ADMIN_PASSWORD
```

3. Build the frontend:

```bash
npm run build:frontend
```

4. Start the API server:

```bash
npm start
```

Server default:

- API: `http://localhost:5000/api`
- Dashboard: `http://localhost:5000/`

## Configuration

Environment variables are loaded from `.env` (or `.env.example` if `.env` does not exist).

### Core

- `PORT` – API server port (default: `5000`)
- `ADMIN_API_KEY` – **required** API key for `x-api-key` header on protected song endpoints
- `ADMIN_USERNAME` – **required** local admin username
- `ADMIN_PASSWORD` – **required** local admin password

### CORS

- `ALLOWED_ORIGINS` – comma-separated list of allowed origins (empty = allow all in dev)

### Storage / Data Paths

- `DATA_DIR` – optional custom data directory (stores `songs.json` when set)
- `SONGS_FILE` – optional absolute/relative path override for songs JSON file
- `AWS_REGION` / `S3_REGION` – used to normalize `s3://bucket/key` URLs

### Supabase

- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` (default: `avatars`)

> **Important:** Never commit real credentials. Use `.env` for local secrets and environment management for production.

## Project Structure

```text
.
├── server.js                      # Express app entry point
├── src/
│   ├── config/
│   │   ├── env.js                 # Environment configuration
│   │   └── supabase.js            # Supabase client setup
│   ├── middleware/
│   │   ├── auth.js                # API key & Supabase auth middleware
│   │   └── upload.js              # Multer file upload config
│   ├── routes/
│   │   ├── auth.js                # Login & auth-check routes
│   │   ├── profile.js             # Supabase profile routes
│   │   └── songs.js               # Song CRUD routes
│   └── utils/
│       ├── category.js            # Category normalization
│       ├── media.js               # URL validation & S3 normalization
│       └── songs.js               # JSON file read/write
├── songs.json                     # Song data (default JSON storage)
├── frontend/                      # React admin dashboard (Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── public/img/                # Static assets (favicon, logos)
├── public/                        # Built frontend output (auto-generated)
├── supabase/
│   └── schema.sql                 # Supabase schema with RLS policies
└── README.md
```

## API Reference

Base URL: `http://localhost:5000`

### Health / Info

- `GET /api` – API metadata and route summary

### Song Endpoints

- `GET /api/songs?page=1&limit=20` – list songs (paginated)
- `POST /api/songs` – create song (**requires `x-api-key`**)
- `PUT /api/songs/:id` – update song (**requires `x-api-key`**)
- `DELETE /api/songs/:id` – delete song (**requires `x-api-key`**)

#### Pagination

The `GET /api/songs` endpoint returns paginated results:

```json
{
  "songs": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "totalPages": 3
  }
}
```

Query parameters:
- `page` – page number (default: 1)
- `limit` – items per page (default: 20, max: 100)

#### `POST /api/songs` input

Accepts multipart form data:

- `title` (required)
- `artist` (required)
- `audio` file **or** `audioUrl` (required)
- `cover` file **or** `coverUrl` (required)
- optional: `category`, `genre`, `singers`, `type`, `vibe`, `featured`, `trending`

### Admin Auth

- `POST /api/login`
  - Supports local username/password auth
  - Also supports Supabase email/password auth when configured
- `GET /api/auth-check` – validates `x-api-key`

### Supabase Auth + Profile

- `POST /api/auth/signup`
- `POST /api/auth/signin`
- `GET /api/profile-view` (**requires bearer token**)
- `PUT /api/profile` (**requires bearer token**)
- `POST /api/profile/avatar` (**requires bearer token**, multipart `avatar`)

### Authentication Headers

API key routes:

```http
x-api-key: <ADMIN_API_KEY>
```

Bearer routes:

```http
Authorization: Bearer <access_token>
```

## Storage & Media Behavior

- Uploaded files are stored under:
  - `uploads/audio/`
  - `uploads/covers/`
- Songs are persisted in `songs.json` by default.
- On delete, local uploaded files referenced by the song are removed automatically.
- `s3://bucket/key` media URLs are normalized to public S3 HTTPS URLs.

## Security

The API includes the following security measures:

- **Helmet** – sets standard security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
- **Rate limiting** – 100 requests per 15 minutes for general API, 20 per 15 minutes for auth endpoints
- **Configurable CORS** – set `ALLOWED_ORIGINS` to restrict cross-origin access
- **No credential leakage** – API keys are never returned in responses
- **Required environment variables** – server exits on startup if admin credentials are missing
- **Path traversal protection** – file deletion only processes paths under `uploads/`
- **UUID song IDs** – prevents ID collision and guessing

Before production:

- Set strong, unique values for `ADMIN_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`
- Configure `ALLOWED_ORIGINS` with your frontend domains
- Use HTTPS via a reverse proxy
- Rotate any exposed Supabase keys
- Consider migrating from JSON storage to a managed database

## Development

Start the API server:

```bash
npm start
```

For frontend development with hot reload:

```bash
cd frontend
npm install
npm run dev
```

Build the frontend for production:

```bash
npm run build:frontend
```

This outputs the built React app to `public/`, which the Express server serves automatically.

## Deployment

Recommended topology:

- **API:** Render, Railway, Fly.io, or AWS
- **Media:** object storage (e.g., S3)
- **Data:** migrate from JSON file to PostgreSQL for production workloads

## License

MIT
