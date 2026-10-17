// A tiny static file server for trying the renderer in a browser (the Electron app does not need it).
//   node scripts/serve.js [port]      then open http://localhost:5173/renderer/index.html
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), port = +process.argv[2] || 5173;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/renderer' || req.url === '/renderer/') { res.writeHead(302, { Location: '/renderer/index.html' }); return res.end(); } // the page loads its scripts relative to renderer/
  const p = path.normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^([/\\])+/, '');
  const f = path.join(root, p === '' ? 'renderer/index.html' : p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('http://localhost:' + port + '/renderer/index.html'));
