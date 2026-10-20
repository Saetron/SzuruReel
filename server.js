import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '8080', 10);
const DIST_DIR = path.join(__dirname, 'dist');

// Container environment defaults
const DEFAULT_URL = process.env.SZURU_URL || '';
const DEFAULT_USER = process.env.SZURU_USER || '';
const DEFAULT_TOKEN = process.env.SZURU_TOKEN || '';

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
    res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime() }));
    return;
  }

  // Server Info endpoint (passes container env vars)
  if (pathname === '/api/server-info') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        defaultUrl: DEFAULT_URL,
        defaultUser: DEFAULT_USER,
        defaultToken: DEFAULT_TOKEN,
      })
    );
    return;
  }

  // CORS Proxy endpoint: /api/proxy?url=<targetUrl>
  if (pathname === '/api/proxy') {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing url query parameter' }));
      return;
    }

    try {
      const parsedTarget = new URL(targetUrl);
      const isHttps = parsedTarget.protocol === 'https:';
      const client = isHttps ? https : http;

      // Filter and forward headers
      const forwardedHeaders = { ...req.headers };
      delete forwardedHeaders['host'];
      delete forwardedHeaders['connection'];
      forwardedHeaders['host'] = parsedTarget.host;

      const proxyReq = client.request(
        targetUrl,
        {
          method: req.method,
          headers: forwardedHeaders,
        },
        (proxyRes) => {
          // Pass status code and relevant headers
          const responseHeaders = { ...proxyRes.headers };
          responseHeaders['access-control-allow-origin'] = '*';
          responseHeaders['access-control-allow-headers'] = '*';
          responseHeaders['access-control-allow-methods'] = '*';

          res.writeHead(proxyRes.statusCode || 200, responseHeaders);
          proxyRes.pipe(res);
        }
      );

      proxyReq.on('error', (err) => {
        console.error('Proxy request error:', err.message);
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Proxy request failed', details: err.message }));
        }
      });

      // Stream incoming request body if POST / PUT
      req.pipe(proxyReq);
      return;
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid URL provided', details: err.message }));
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
      // If not a file, serve index.html (SPA fallback)
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

      // Cache control: hashed assets cache forever, html does not
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
  console.log(`SzuruReel server listening on http://0.0.0.0:${PORT}`);
  if (DEFAULT_URL) {
    console.log(`Default Szurubooru Instance: ${DEFAULT_URL}`);
  }
});
