// Baut den klickbaren Prototyp nach build/prototype/:
//   index.html         zum lokalen Öffnen im Browser (vollständiges HTML-Dokument)
//   gkg-prototyp.html  dieselbe Seite ohne Dokument-Gerüst – so wird sie als Artifact veröffentlicht
//   ds/                Tokens (folgen der Systemeinstellung hell/dunkel) und die Komponenten aus design-system/
const fs = require('fs');
const path = require('path');
const { buildTokensCss } = require('./tokens-css');

const root = path.resolve(__dirname, '..');
const src = path.join(root, 'prototype');
const out = path.join(root, 'build', 'prototype');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'ds'), { recursive: true });

for (const f of ['app.js', 'app.css', 'data.js']) fs.copyFileSync(path.join(src, f), path.join(out, f));
fs.writeFileSync(path.join(out, 'ds', 'tokens.css'), buildTokensCss(path.join(root, 'design-system', 'tokens.json'), 'auto'));
for (const f of ['bundle.js', 'bundle.css']) fs.copyFileSync(path.join(root, 'design-system', 'components', f), path.join(out, 'ds', f));

const fragment = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
fs.writeFileSync(path.join(out, 'gkg-prototyp.html'), fragment);
fs.writeFileSync(path.join(out, 'index.html'),
  '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n</head>\n<body>\n' +
  fragment + '</body>\n</html>\n');

console.log('Prototyp gebaut: ' + path.relative(root, path.join(out, 'index.html')));
