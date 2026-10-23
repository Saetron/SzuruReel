import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const DIST_DIR = path.join(__dirname, 'dist');

// Docker Environment Configuration (Instance-level; user auth is handled in WebUI for multi-user support)
const SZURU_URL = (process.env.SZURU_URL || process.env.SZURU_API_URL || '').replace(/\/+$/, '');
const SZURU_MEDIA_URL = (process.env.SZURU_MEDIA_URL || '').replace(/\/+$/, '');
const SZURU_DATA_DIR = process.env.SZURU_DATA_DIR || (fs.existsSync('/data') ? '/data' : '');
const SZURU_USE_PROXY = process.env.SZURU_USE_PROXY !== 'false'; // default true for docker networking/CORS
const SZURU_DEFAULT_SAFETY = process.env.SZURU_DEFAULT_SAFETY || 'all';
const SZURU_AUTOPLAY_SOUND = process.env.SZURU_AUTOPLAY_SOUND === 'true';
const SZURU_DEFAULT_SORT = process.env.SZURU_DEFAULT_SORT || 'date-desc';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function findLocalDataFile(targetPath) {
  if (!SZURU_DATA_DIR) return null;
  const clean = targetPath.replace(/^\/+/, '');
  // 1. Try direct: SZURU_DATA_DIR / clean
  const p1 = path.join(SZURU_DATA_DIR, clean);
  if (p1.startsWith(SZURU_DATA_DIR) && fs.existsSync(p1) && fs.statSync(p1).isFile()) {
    return p1;
  }
  // 2. If clean starts with "data/", try without "data/"
  if (clean.startsWith('data/')) {
    const stripped = clean.slice(5);
    const p2 = path.join(SZURU_DATA_DIR, stripped);
    if (p2.startsWith(SZURU_DATA_DIR) && fs.existsSync(p2) && fs.statSync(p2).isFile()) {
      return p2;
    }
  }
  return null;
}

function serveFileWithRanges(filePath, req, res) {
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const totalSize = stats.size;
    const range = req.headers['range'];

    const commonHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Last-Modified': stats.mtime.toUTCString(),
      'ETag': `"${stats.size.toString(16)}-${stats.mtime.getTime().toString(16)}"`,
    };

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || isNaN(start)) {
        res.writeHead(416, {
          ...commonHeaders,
          'Content-Range': `bytes */${totalSize}`,
        });
        res.end();
        return;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Content-Length': chunkSize,
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        ...commonHeaders,
        'Content-Length': totalSize,
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  });
}

function proxyRequest(targetUrl, req, res) {
  try {
    const parsedTarget = new URL(targetUrl);
    const isHttps = parsedTarget.protocol === 'https:';
    const client = isHttps ? https : http;

    const isMedia =
      /\.(png|jpe?g|gif|webp|svg|ico|mp4|webm|mov|mkv)$/i.test(parsedTarget.pathname) ||
      parsedTarget.pathname.includes('/data/') ||
      parsedTarget.pathname.includes('/thumbnails/') ||
      parsedTarget.pathname.includes('/avatars/');

    // Check if local file exists on disk
    if (isMedia && SZURU_DATA_DIR) {
      const localFile = findLocalDataFile(parsedTarget.pathname);
      if (localFile) {
        serveFileWithRanges(localFile, req, res);
        return;
      }
    }

    const forwardedHeaders = { ...req.headers };
    delete forwardedHeaders['host'];
    delete forwardedHeaders['connection'];
    forwardedHeaders['host'] = parsedTarget.host;

    // For media requests, avoid forwarding restrictive JSON Accept headers
    if (isMedia) {
      forwardedHeaders['accept'] = '*/*';
    }

    const proxyReq = client.request(
      targetUrl,
      {
        method: req.method,
        headers: forwardedHeaders,
      },
      (proxyRes) => {
        const responseHeaders = { ...proxyRes.headers };
        responseHeaders['access-control-allow-origin'] = '*';
        responseHeaders['access-control-allow-headers'] = '*';
        responseHeaders['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';

        if (isMedia) {
          responseHeaders['accept-ranges'] = 'bytes';
          if (!responseHeaders['cache-control']) {
            responseHeaders['cache-control'] = 'public, max-age=31536000';
          }
        }

        res.writeHead(proxyRes.statusCode || 200, responseHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('error', (err) => {
      console.error(`[Proxy Error] Failed request to ${targetUrl}:`, err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Proxy request failed', details: err.message, target: targetUrl }));
      }
    });

    req.pipe(proxyReq);
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid proxy target URL', details: err.message }));
  }
}

const server = http.createServer((req, res) => {
  // CORS Headers for API and Proxy
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Healthcheck endpoint
  if (pathname === '/healthz' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy',
      uptime: process.uptime(),
      instanceConfigured: Boolean(SZURU_URL),
    }));
    return;
  }

  // Docker Environment Configuration endpoint (Instance-level defaults)
  if (pathname === '/api/config' || pathname === '/api/server-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        instanceUrl: SZURU_URL,
        mediaUrl: SZURU_MEDIA_URL,
        useProxy: SZURU_USE_PROXY,
        hasDataDir: Boolean(SZURU_DATA_DIR),
        defaultSafety: SZURU_DEFAULT_SAFETY,
        autoPlaySound: SZURU_AUTOPLAY_SOUND,
        defaultSort: SZURU_DEFAULT_SORT,
      })
    );
    return;
  }

  // CORS Proxy endpoint: /api/proxy?url=<targetUrl>
  if (pathname === '/api/proxy') {
    let targetUrl = parsedUrl.searchParams.get('url');

    if (!targetUrl && SZURU_URL) {
      targetUrl = SZURU_URL;
    }

    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url query parameter and SZURU_URL environment variable is unset.' }));
      return;
    }

    // If relative path given, prepend SZURU_MEDIA_URL or SZURU_URL
    if (targetUrl.startsWith('/')) {
      const base = SZURU_MEDIA_URL || SZURU_URL;
      if (base) {
        targetUrl = `${base}${targetUrl}`;
      }
    }

    proxyRequest(targetUrl, req, res);
    return;
  }

  // Direct Media Proxy & Volume Serving Routes (like SzuruRelay: /data/*, /thumbnails/*, /generated-thumbnails/*, /avatars/*)
  const isDirectMediaRoute =
    pathname.startsWith('/data/') ||
    pathname.startsWith('/thumbnails/') ||
    pathname.startsWith('/generated-thumbnails/') ||
    pathname.startsWith('/avatars/') ||
    pathname.startsWith('/custom-content/');

  if (isDirectMediaRoute) {
    // 1. Try local file if volume is mounted
    const localFile = findLocalDataFile(pathname);
    if (localFile) {
      serveFileWithRanges(localFile, req, res);
      return;
    }

    // 2. Otherwise proxy to upstream media or instance URL
    const upstreamBase = SZURU_MEDIA_URL || SZURU_URL;
    if (upstreamBase) {
      const targetUrl = `${upstreamBase}${pathname}${parsedUrl.search}`;
      proxyRequest(targetUrl, req, res);
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(DIST_DIR, pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      if (ext === '.html') {
        res.setHeader('Cache-Control', 'no-cache');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SzuruReel] Server listening on http://0.0.0.0:${PORT}`);
  if (SZURU_URL) {
    console.log(`[SzuruReel] Configured Szurubooru Instance URL: ${SZURU_URL}`);
    console.log(`[SzuruReel] Proxy Mode: ${SZURU_USE_PROXY ? 'ENABLED' : 'DISABLED'}`);
  } else {
    console.log(`[SzuruReel] Note: SZURU_URL environment variable not set. Configure via Docker environment or GUI settings.`);
  }
});
