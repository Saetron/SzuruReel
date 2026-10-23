# SzuruReel 🎬✨

A sleek, responsive modern web client for **Szurubooru** featuring a **TikTok-style Reel Mode** for video and media posts, responsive gallery browsing, tag discovery, comment interactions, and direct API upload.

Built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Vite**, packaged in a lightweight, multi-stage **Docker** container.

---

## ✨ Features

### 📱 TikTok-Style Reel Mode
- **Vertical Infinite Feed**: Smooth CSS scroll-snap (`scroll-snap-type: y mandatory`) container with native `scrollsnapchange` event detection and `IntersectionObserver` fallback.
- **Auto-Play & Auto-Pause**: Active video reel plays automatically with smooth loop; off-screen videos pause to save bandwidth and CPU.
- **Double-Tap to Like**: Tap media twice to trigger a floating heart particle burst and instantly upvote the post.
- **Interactive Action Bar**:
  - ❤️ **Like / Heart** with live score counter
  - ⭐️ **Save / Favorite** toggle
  - 💬 **Slide-up Comments Drawer** (read and post comments without losing your reel position)
  - 🔊 **Global Audio Mute / Unmute** toggle
  - 🔗 **Share Link** to clipboard
  - ℹ️ **Post Details Modal** with resolution, file size, checksum, and full metadata
- **Bottom Info Overlay**: Uploader avatar, relative time, post source link, and clickable color-coded tag pills.
- **Keyboard Shortcuts**:
  - `↑` / `k` — Previous reel
  - `↓` / `j` — Next reel
  - `Space` — Play / Pause video
  - `m` — Toggle mute
  - `l` — Like post
  - `f` — Favorite post

---

### 🖼️ Responsive Gallery Mode
- **Adaptive Masonry Grid**: Mobile 2-column, tablet 3-column, desktop 4–5 column grid.
- **Tag Autocomplete**: Fast real-time suggestions as you type tags (`cyberpunk`, `animated`, `studio_trigger`).
- **Media Filters**: Quick-switch between **All Media**, **Videos/Reels Only**, or **Images Only**.
- **Safety Rating Filtering**: Filter by `safe`, `sketchy`, or `unsafe` posts.
- **Sort Orders**: Newest, oldest, highest score, or random order.
- **Instant "Watch in Reel"**: One-click button on any thumbnail jumps directly into full-screen Reel mode starting from that exact post.

---

### 🏷️ Tag Explorer & Categories
- Browse booru tags categorized by **Artist**, **Character**, **Copyright**, **General**, and **Meta**.
- Shows total post usage counts for each tag.
- Click any tag to immediately search the booru.

---

### 📤 Upload to Booru
- Drag-and-drop or file picker for images and videos (`MP4`, `WebM`, `PNG`, `JPG`, `GIF`, `WebP`).
- Real-time media preview.
- Tag tagger with autocomplete suggestions.
- Safety rating selection and source URL attribution.

---

### ⚡ Direct API & Container CORS Proxy
- **Direct Mode**: Browser connects straight to your Szurubooru API (`/api/...`).
- **Container CORS Proxy Mode**: Built-in zero-dependency Node proxy (`/api/proxy`) transparently injects permissive CORS headers, allowing you to connect to remote or containerized Szurubooru instances without browser cross-origin blocks.

---

## 🐳 Docker Deployment & Environment Configuration

SzuruReel is configured entirely through standard **Docker environment variables**.

### Environment Variables Reference

| Variable | Description | Default | Example |
| :--- | :--- | :--- | :--- |
| `SZURU_URL` | Base URL of your Szurubooru instance (no trailing slash) | *(empty)* | `https://booru.example.com` or `http://szurubooru:8080` |
| `SZURU_USER` | Username for authenticated actions (likes, favorites, comments, uploads) | *(empty)* | `alice` |
| `SZURU_TOKEN` | API token / password for the user | *(empty)* | `mysecrettoken` |
| `SZURU_USE_PROXY` | Route requests through container's built-in CORS proxy | `true` | `true` / `false` |
| `SZURU_DEFAULT_SAFETY` | Default safety filter | `all` | `all`, `safe`, `sketchy`, `unsafe` |
| `SZURU_AUTOPLAY_SOUND` | Default video audio playback | `false` | `false` (muted), `true` (unmuted) |
| `SZURU_DEFAULT_SORT` | Default post sorting order | `date-desc` | `date-desc`, `date-asc`, `score-desc`, `random` |
| `PORT` | Container web server port | `8080` | `8080` |

---

### Running with Docker Compose (Recommended)

1. Clone this repository:
   ```bash
   git clone <repo-url> booru
   cd booru
   ```

2. Edit `docker-compose.yml` to set your instance URL:
   ```yaml
   services:
     szuru-reel:
       image: szuru-reel:latest
       build: .
       ports:
         - "8080:8080"
       environment:
         - SZURU_URL=https://booru.example.com
         - SZURU_USER=myusername
         - SZURU_TOKEN=mysecretapitoken
         - SZURU_USE_PROXY=true
         - SZURU_DEFAULT_SAFETY=all
         - SZURU_AUTOPLAY_SOUND=false
         - PORT=8080
   ```

3. Launch container:
   ```bash
   docker compose up -d
   ```

4. Open your browser at [http://localhost:8080](http://localhost:8080).

---

### Running with Docker CLI

```bash
docker build -t szuru-reel .

docker run -d \
  -p 8080:8080 \
  -e SZURU_URL="https://booru.example.com" \
  -e SZURU_USER="myusername" \
  -e SZURU_TOKEN="mysecretapitoken" \
  --name szuru-reel \
  szuru-reel
```

---

## 🛠️ Local Development

### Requirements
- Node.js 18+
- npm

### Installation & Run

```bash
# 1. Install dependencies
npm install

# 2. Run Vite development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

To build the production bundle:
```bash
npm run build
npm start # runs the lightweight server on port 8080
```

---

## 📂 Project Structure

```
├── Dockerfile              # Multi-stage production Docker build
├── docker-compose.yml      # Docker Compose setup
├── server.js               # Lightweight Node.js server with CORS proxy & env configuration
├── package.json
├── LICENSE                 # European Union Public Licence (EUPL-1.2)
├── vite.config.ts
├── src/
│   ├── types/
│   │   └── szuru.ts        # TypeScript definitions for Szurubooru API & Docker config
│   ├── services/
│   │   └── szuruApi.ts     # Szurubooru API client (direct & proxy)
│   ├── context/
│   │   └── SzuruContext.tsx # Central app state initialized from Docker env
│   ├── components/
│   │   ├── ReelMode.tsx    # Vertical scroll snap container with snap detection
│   │   ├── ReelItem.tsx    # TikTok slide, video player, double-tap heart, action bar
│   │   ├── ReelComments.tsx# Slide-up comments drawer
│   │   ├── GalleryMode.tsx # Responsive masonry grid with tag autocomplete
│   │   ├── PostDetailModal.tsx # High-res modal, tag breakdown, comments, download
│   │   ├── TagExplorer.tsx # Tag directory with category tabs
│   │   ├── UploadModal.tsx # Media upload form
│   │   ├── SettingsModal.tsx # Instance URL, credentials, and CORS settings
│   │   ├── Navbar.tsx      # Top bar & mobile bottom navigation
│   │   └── Toast.tsx       # Toast notifications
│   ├── App.tsx
│   └── main.tsx
```

---

## 🔒 License
This project is licensed under the [European Union Public Licence (EUPL-1.2)](LICENSE).
