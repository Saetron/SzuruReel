# Changelog

All notable changes to the **SzuruReel** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2026-10-23

### Changed
- Moved instance configuration entirely to **Docker environment variables** (`SZURU_URL`, `SZURU_USER`, `SZURU_TOKEN`, `SZURU_USE_PROXY`, `SZURU_DEFAULT_SAFETY`, `SZURU_AUTOPLAY_SOUND`, `SZURU_DEFAULT_SORT`).
- Updated `server.js` with an `/api/config` endpoint that injects container environment variables into the frontend on boot.
- Added support for resetting GUI settings to Docker container defaults.

### Removed
- Removed demo/mock posts and categories fallback (`src/services/mockData.ts`).
- Removed demo mode toggle from settings; the client now interfaces directly with real Szurubooru instances.

### Added
- Added `AGENTS.md` specifying developer and agent architecture guidelines.
- Added `CHANGELOG.md` tracking project revisions.
- Added helpful setup prompts in Reel and Gallery views when `SZURU_URL` has not yet been set.

---

## [1.0.0] - 2026-10-20

### Added
- **TikTok-Style Reel Mode**:
  - Vertical infinite feed with CSS scroll snap (`scroll-snap-type: y mandatory`).
  - Active slide detection using `scrollsnapchange` event with `IntersectionObserver` fallback.
  - Video autoplay on snap and auto-pause when scrolled out of view.
  - Double-tap gesture for animated floating heart particles and quick post upvoting.
  - Right-side action rail: Like counter, favorite bookmark, audio mute/unmute, share link, and post info modal.
  - Slide-up interactive comments drawer allowing reading and writing comments without losing feed position.
  - Keyboard navigation shortcuts (`↑`, `↓`, `Space`, `m`, `l`, `f`).
- **Responsive Gallery Mode**:
  - Masonry grid layout adaptive across mobile (2 col), tablet (3 col), and desktop (4–5 col).
  - Real-time tag autocomplete with post usage counts.
  - Filter chips for media types (`All`, `Videos Only`, `Images Only`).
  - Safety rating filter (`All`, `Safe`, `Sketchy`, `Unsafe`) and sort order options.
  - "Watch in Reel" button on thumbnails to jump directly into full-screen reel mode.
- **Tag Explorer**:
  - Directory of booru tags organized by categories (Artist, Character, Copyright, General, Meta) with usage counts.
- **Media Upload**:
  - Drag-and-drop file uploader for videos and images with tagger, safety selector, and source URL attribution.
- **Szurubooru API Client**:
  - Direct API connection and optional container-based CORS proxy mode (`/api/proxy`).
- **Production Docker Deployment**:
  - Multi-stage `Dockerfile` with Node 22 Alpine builder and minimal runtime runner.
  - Preconfigured `docker-compose.yml`.
