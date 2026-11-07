const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const modules = path.join(root, 'node_modules');
const jobs = [
  ['glyphtex-engine/wasm/tectonic_wasm.wasm', 'js/engine/tectonic_wasm.wasm'],
  ['glyphtex-engine/wasm/tectonic-bundle.tar.gz', 'js/engine/tectonic-bundle.tar.gz'],
  ['glyphtex-engine/LICENSE', 'js/engine/LICENSE-glyphtex-engine.txt'],
  ['pdfjs-dist/legacy/build/pdf.min.mjs', 'js/pdfjs/pdf.min.mjs'],
  ['pdfjs-dist/legacy/build/pdf.worker.min.mjs', 'js/pdfjs/pdf.worker.min.mjs'],
  ['pdfjs-dist/LICENSE', 'js/pdfjs/LICENSE-pdfjs.txt']
];

for (const [from, to] of jobs) {
  const source = path.join(modules, from);
  const target = path.join(root, to);
  if (!fs.existsSync(source)) throw new Error(`Fehlende Quelle: ${from}. Bitte zuerst npm ci ausführen.`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  console.log(`${to} (${fs.statSync(target).size} Bytes)`);
}
