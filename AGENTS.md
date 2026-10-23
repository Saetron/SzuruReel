# AGENTS.md — Developer & AI Agent Guidelines

This document outlines the architecture, design principles, commands, and conventions for AI coding agents and developers working on **SzuruReel**.

---

## 🏛️ Architecture Overview

SzuruReel is a high-performance web client for **Szurubooru** featuring a TikTok-style vertical reel mode, masonry gallery browsing, tag exploration, comment threads, and direct API uploads.

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Lucide React icons, Canvas Confetti.
- **Server**: Lightweight, zero-external-dependency Node.js HTTP server (`server.js`) that serves prebuilt SPA assets (`dist/`), handles SPA routing fallbacks, exposes `/api/config` to pass Docker environment variables to the frontend, and provides `/api/proxy` to circumvent browser CORS restrictions when contacting remote Szurubooru instances.
- **Packaging**: Multi-stage production `Dockerfile` (Node 22 Alpine builder $\rightarrow$ minimal non-root runtime) and `docker-compose.yml`.

---

## 🛠️ Key Build & Development Commands

```bash
# Install dependencies
npm install

# Start Vite development server (port 3000)
npm run dev

# Typecheck and build production bundle into dist/
npm run build

# Start production server locally (port 8080)
npm start
# or: node server.js
```

> **Note**: Always run `npm run build` after making modifications to verify TypeScript types and Vite bundling succeed without errors.

---

## 🐳 Docker Environment Variables

All configuration is driven via Docker environment variables:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `SZURU_URL` | Base URL of target Szurubooru instance (no trailing slash) | `""` |
| `SZURU_USER` | API Username | `""` |
| `SZURU_TOKEN` | API Token / password | `""` |
| `SZURU_USE_PROXY` | Proxy requests through container backend (`true`/`false`) | `true` |
| `SZURU_DEFAULT_SAFETY` | Default safety rating (`all`, `safe`, `sketchy`, `unsafe`) | `all` |
| `SZURU_AUTOPLAY_SOUND` | Default video audio playback (`false` = muted, `true` = unmuted) | `false` |
| `SZURU_DEFAULT_SORT` | Default post sort order (`date-desc`, `date-asc`, `score-desc`, `random`) | `date-desc` |
| `PORT` | Container web server port | `8080` |

---

## 🎯 Component Conventions & Best Practices

1. **Reel Mode (`src/components/ReelMode.tsx` & `src/components/ReelItem.tsx`)**:
   - Container must use `scroll-snap-type: y mandatory` and slides must use `snap-start snap-always`.
   - Slide synchronization uses the modern `scrollsnapchange` event (`'onscrollsnapchange' in HTMLElement.prototype`) with an `IntersectionObserver` fallback.
   - Only the active slide plays media. When a slide leaves view, video playback stops and timestamp resets.
   - Double-tap detection triggers heart particle animations and score upvoting.
   - Mute state is synchronized globally across reels.

2. **Szurubooru API Client (`src/services/szuruApi.ts`)**:
   - Resolves media URLs (`contentUrl`, `thumbnailUrl`) to either direct remote URLs or proxied URLs depending on `config.useProxy`.
   - Sends `Authorization: Token <base64(user:token)>` header when credentials are present.
   - Do NOT introduce mock/demo fallback data; requests must target the live Szurubooru API instance or display appropriate unconfigured/error states.

3. **Styling**:
   - Dark mode aesthetic by default (`#0c0d14` background, translucent glassmorphism panels with `#151722` / `slate-900`).
   - Use Tailwind utility classes. Avoid arbitrary hardcoded inline style tags where Tailwind classes exist.

4. **Git Commits**:
   - Write clear, conventional commit messages (`feat: ...`, `fix: ...`, `chore: ...`).
   - Commit logically grouped changes together.
