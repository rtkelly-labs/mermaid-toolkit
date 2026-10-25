import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const PORT = Number(process.env.PORT || 3000);
const outDir = path.resolve(__dirname, '..', 'temp', 'site-artifacts');

if (!fs.existsSync(outDir)) {
  console.error(`Error: Artifacts directory not found at ${outDir}.`);
  console.error('Run "pnpm site:build" first to generate the site artifacts.');
  process.exit(1);
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url ? req.url.split('?')[0] : '/';
  if (reqPath === '/') {
    reqPath = '/index.html';
  }

  const filePath = path.join(outDir, reqPath);

  // Security: prevent path traversal out of outDir
  if (!filePath.startsWith(outDir)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
});

server.listen(PORT, () => {
  console.log(
    `\n🚀 Mermaid Toolkit Showcase running at: http://localhost:${PORT}/`,
  );
  console.log(`   Serving artifacts from: ${outDir}\n`);
});
