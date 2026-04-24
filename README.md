# 🎵 AZAAD Music Platform

![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![React](https://img.shields.io/badge/React-Frontend-blue)
![Supabase](https://img.shields.io/badge/Auth-Supabase-orange)
![License](https://img.shields.io/badge/License-MIT-purple)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)

A scalable full-stack music management system with a secure backend API and modern admin dashboard for uploading, managing, and controlling music content.

---

## 🚀 Features

- 🎧 Upload and manage songs (audio + cover)
- 🔐 Secure authentication (Admin + Supabase)
- 🧠 Profile system with avatar upload
- ⚡ Fast React admin dashboard
- ☁️ Optional AWS S3 integration
- 📊 Searchable music library
- 🎨 Branding & settings support

---

## 🧱 Tech Stack

| Layer        | Technology              |
|-------------|------------------------|
| Backend      | Node.js + Express      |
| Frontend     | React (Vite)           |
| Auth         | Supabase Auth          |
| Storage      | Local / AWS S3         |
| Database     | JSON (dev) / scalable upgrade ready |

---

## 📂 Project Structure

```

azaad/
├── backend/
│   ├── uploads/
│   ├── data/songs.json
│   ├── routes/
│   └── server.js
│
├── frontend/
│   ├── src/
│   └── App.jsx
│
├── .env
└── README.md

```

---

## 🌐 API Endpoints

### Core
```

GET /api
GET /api/songs

```

### Songs (Protected)
```

POST /api/songs
DELETE /api/songs/:id

```

🔐 Requires:
```

x-api-key: YOUR_API_KEY

```

---

### Authentication
```

POST /api/auth/signup
POST /api/auth/signin
POST /api/login

```

---

### Profile (Protected)
```

GET /api/profile-view
PUT /api/profile
POST /api/profile/avatar

```

🔐 Requires:
```

Authorization: Bearer <access_token>

````

---

## ⚙️ Backend Setup

```bash
npm install
npm start
````

Server runs on:

```
http://localhost:5000
```

---

## 🖥️ Admin Dashboards

### 🔹 Built-in Upload UI

```
http://localhost:5000/
```

✔ Upload songs
✔ Preview content

---

### 🔹 React Admin Dashboard

```bash
cd frontend
npm install
npm run dev
```

Access:

```
http://localhost:5173
```

✔ API key login
✔ Upload with preview
✔ Delete tracks
✔ Search music
✔ Profile settings

---

## 🔐 Environment Variables

Create `.env`:

```env
# Security
ADMIN_API_KEY=your_api_key
ADMIN_USERNAME=your_username
ADMIN_PASSWORD=your_password

# AWS (optional)
AWS_REGION=your-region

# Supabase
SUPABASE_URL=your_url
SUPABASE_ANON_KEY=your_key
```

⚠️ Never commit `.env` to GitHub.

---

## ☁️ AWS S3 Support

* Accepts:

```
s3://bucket/key
```

* Automatically converts to:

```
https://bucket.s3.region.amazonaws.com/key
```

---

## 🧠 Supabase Setup

1. Install:

```bash
npm install @supabase/supabase-js dotenv
```

2. Run SQL schema (`supabase/schema.sql`)

3. Enable:

* Email/Password authentication

---

## 🔄 Authentication Flow

1. Login:

```
POST /api/auth/signin
```

2. Use token:

```
Authorization: Bearer <access_token>
```

---

## 🛡️ Security Best Practices

* Use environment variables only
* Rotate API keys regularly
* Validate uploads (size/type)
* Enable HTTPS in production
* Restrict CORS
* Protect admin routes

---

## 📦 Production Improvements

* Replace JSON → PostgreSQL / MongoDB
* Add rate limiting
* Add logging (Winston / Pino)
* Use Docker
* CDN for media delivery

---

## 🚀 Deployment

| Service  | Recommended            |
| -------- | ---------------------- |
| Backend  | Render / Railway / AWS |
| Frontend | Vercel / Netlify       |
| Storage  | AWS S3                 |

---

## ✨ Future Roadmap

* 🎼 Playlist system
* 👥 Role-based access
* 📈 Analytics dashboard
* 📡 Streaming (HLS)
* 🌍 CDN optimization

---

## 📸 Screenshots (Add Later)

```
/screenshots/dashboard.png
/screenshots/upload.png
```

---

## 📄 License

MIT License © 2026 AZAAD

---

## 👨‍💻 Author

**Mahin**
Engineer | Aerospace Composites | Full-stack Builder

---

## ⭐ Support

If you like this project:

* ⭐ Star this repo
* 🍴 Fork it
* 🧠 Contribute ideas

---

## 🔥 Tagline

> “Build. Upload. Stream. Scale.”

