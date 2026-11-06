/* Local only: actual public page + shared import review, with fixture adapters. */
'use strict';
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const root = path.resolve(__dirname, '..');
function publicHtml() {
  const banner = '<aside class="preview-bar"><strong>Maquette locale · données fictives</strong><nav><a href="/" aria-current="page">Public</a><a href="/bureau">Bureau des performances</a></nav><span>Publication simulée sur cet ordinateur · aucun accès NAP / Firebase</span></aside>';
  return fs.readFileSync(path.join(root, 'direct.html'), 'utf8')
    .replace('</head>', '<link rel="stylesheet" href="/tools/direct-preview/preview.css"></head>')
    .replace('<body>', '<body>' + banner)
    .replace('<script src="assets/livepalmes-environment.js"></script>', '<script src="/tools/direct-preview/fixtures.js"></script><script src="/tools/direct-preview/public-adapter.js"></script>');
}
function start(port = 8765) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://127.0.0.1');
    let name;
    try {name = decodeURIComponent(url.pathname);} catch {response.writeHead(400); response.end(); return;}
    response.setHeader('Cache-Control','no-store');
    response.setHeader('X-Content-Type-Options','nosniff');
    if (name === '/' || name === '/direct.html') {response.setHeader('Content-Type','text/html; charset=utf-8'); response.end(publicHtml()); return;}
    if (name === '/bureau') name = '/tools/direct-preview/admin.html';
    if (name === '/logo-ffessm-nage-avec-palmes.png') {response.setHeader('Content-Type','image/png');response.end(fs.readFileSync(path.join(root,name.slice(1))));return;}
    const target = path.resolve(root, '.' + name);
    const allowed = name.startsWith('/assets/') || name.startsWith('/tools/direct-preview/');
    const safe = target.startsWith(path.join(root,'assets') + path.sep) || target.startsWith(path.join(root,'tools','direct-preview') + path.sep);
    if (!allowed || !safe || !['.html','.js','.css'].includes(path.extname(target))) {response.writeHead(404); response.end('Not found'); return;}
    fs.readFile(target, (error, bytes) => {
      if (error) {response.writeHead(404); response.end('Not found'); return;}
      response.setHeader('Content-Type', ({'.html':'text/html','.js':'text/javascript','.css':'text/css'}[path.extname(target)]) + '; charset=utf-8'); response.end(bytes);
    });
  });
  return new Promise((resolve, reject) => {server.on('error',reject); server.listen(port,'127.0.0.1',() => resolve({server,baseUrl:'http://127.0.0.1:' + server.address().port}));});
}
if (require.main === module) start(Number(process.argv[2]) || 8765).then(({baseUrl}) => console.log(`Maquette Direct : ${baseUrl}/?id=900001\nBureau : ${baseUrl}/bureau`)).catch(error => {console.error(error.message);process.exitCode=1;});
module.exports = {start};
