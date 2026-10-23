# Changelog

All notable changes to the **SzuruReel** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] - 2026-10-23

### Added
- **Multi-User WebUI Authentication**:
  - Removed server-level username and password/token environment variables (`SZURU_USER`, `SZURU_TOKEN`) so credentials are never shared or leaked across container visitors.
  - Added dedicated WebUI user authentication (`LoginModal`): multiple users can each sign in with their own Szurubooru credentials in their browser.
  - User session badge in the navigation bar displaying active avatar, username, and rank badge, with quick access to view profile, switch account, or log out.
  - Per-browser session isolation and persistence in `localStorage`.
- **Full Client Feature Parity with official Szurubooru Client**:
  - **Interactive Image Notes (`Note`)**:
    - Draw, add, view, and delete bounding box annotation notes on images with tooltips.
    - Toggle notes visibility on and off.
  - **Pools / Collections View (`/pools`, `/pool/:id`)**:
    - Browse pools with category filtering and search.
    - Ordered gallery view of posts within a pool.
    - Create new pools, edit pools, and delete pools.
    - Show pool membership and previous/next navigation within pools on post details.
  - **Global Comments Feed (`/comments`)**:
    - Unified feed of recent comments across all booru posts with thumbnails, authors, timestamps, and comment voting (`+1` / `-1`).
  - **Community Users Directory & Profiles (`/users`, `/user/:name`)**:
    - Directory of contributors with rank badges (Regular, Power, Moderator, Administrator) and upload counts.
    - User Profile modal displaying bio, registered date, and tabs for user's Uploads and user's Favorites.
  - **System Snapshots & Activity Audit Log (`/snapshots`)**:
    - View recent changes across posts, tags, pools, and comments with operation badges (created, modified, deleted) and author links.
  - **Tag & Tag Category Management**:
    - Create new tags, edit tag aliases, suggestions, and implications.
    - Manage tag categories with custom colors and names.
  - **Advanced Post Editing & Lifecycle**:
    - Inline post editor for tags, safety rating, source URL, and relations.
    - Delete post with confirmation.
    - Merge post into another post ID (`/api/post-merge`).
  - **Advanced Upload Capabilities**:
    - Support for both local file upload and **Remote URL upload** (`contentUrl`).
    - **Duplicate Image Detection**: Runs reverse image search (`/api/posts/from-image`) on file selection to alert if a duplicate or similar image already exists.
    - Anonymous upload option.
  - **Interactive Search Syntax Cheatsheet**:
    - Full reference modal for query tokens, wildcard matching, safety, score ranges, dates, dimensions, uploaders, and pools.

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
