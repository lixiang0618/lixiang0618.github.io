/* Loopback preview. The sole API route reads the existing public location API. */
const path = require('node:path');
const https = require('node:https');
const server = require('http-server').createServer({
  root: path.resolve(__dirname, '..'), cache: -1, showDir: false,
  before: [(req, res) => {
    if (req.url.split('?')[0] !== '/__profile-location') return res.emit('next');
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const upstream = https.get('https://api.lxiang.cc/api/location', {headers: {Accept: 'application/json'}, timeout: 6000}, response => {
      res.writeHead(response.statusCode, {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store'});
      response.pipe(res);
    });
    upstream.on('timeout', () => upstream.destroy());
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502, {'Content-Type': 'application/json'}); res.end('{"success":false}'); });
  }]
});
server.listen(8767, '127.0.0.1', () => console.log('Homepage preview: http://127.0.0.1:8767/zh/index.html'));
