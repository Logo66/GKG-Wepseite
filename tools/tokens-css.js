// Erzeugt CSS-Variablen aus design-system/tokens.json.
//   mode 'attribute': Themes nur über data-theme (wie im Design-System-Artifact)
//   mode 'auto':      zusätzlich prefers-color-scheme, damit eine Seite der Systemeinstellung folgt
const fs = require('fs');
const path = require('path');

function buildTokensCss(tokensPath, mode = 'attribute') {
  const tok = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
  const themes = tok.color.themes.map(t => t.id);
  const [first, second] = themes;
  const val = (t, th) => (typeof t.value === 'string' ? t.value : (t.value[th] ?? t.value[first]));
  const alias = v => v.replace(/^\{(.+)\}$/, 'var(--$1)');
  const block = (th, indent) => {
    let s = '';
    tok.color.tokens.forEach(t => { s += `${indent}--${t.name}: ${alias(val(t, th))};\n`; });
    (tok.shadow?.tokens || []).forEach(t => { s += `${indent}--${t.name}: ${val(t, th)};\n`; });
    return s;
  };

  let css = `/* ${tok.name} — generated from tokens.json */\n`;
  if (mode === 'auto' && second) {
    css += `:root {\n${block(first, '  ')}}\n`;
    css += `@media (prefers-color-scheme: ${second}) {\n  :root:not([data-theme="${first}"]) {\n${block(second, '    ')}    color-scheme: ${second};\n  }\n}\n`;
    css += `:root[data-theme="${second}"] {\n${block(second, '  ')}  color-scheme: ${second};\n}\n`;
  } else {
    themes.forEach((th, i) => {
      css += (i === 0 ? `:root, [data-theme="${th}"]` : `[data-theme="${th}"]`) + ` {\n${block(th, '  ')}}\n`;
    });
  }
  css += ':root {\n';
  ['spacing', 'radius', 'size'].forEach(f => (tok[f]?.tokens || []).forEach(t => { css += `  --${t.name}: ${t.value};\n`; }));
  Object.entries(tok.type.families).forEach(([k, v]) => { css += `  --font-${k}: ${v};\n`; });
  css += '}\n';
  return css;
}

module.exports = { buildTokensCss };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  process.stdout.write(buildTokensCss(path.join(root, 'design-system', 'tokens.json'), process.argv[2] || 'attribute'));
}
