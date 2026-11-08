const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createHash } = require('node:crypto');
const { TexEngine, parsePackIndex, resolveMissing, unpackTarGz } = require('glyphtex-engine');

const root = path.join(__dirname, '..');

test('Das ausgelieferte KOMA-Script-Paket ermöglicht eine echte scrbook-Kompilierung', async () => {
  const enginePath = path.join(root, 'js/engine');
  const packPath = path.join(enginePath, 'packs');
  const index = JSON.parse(fs.readFileSync(path.join(packPath, 'packs-index.json'), 'utf8'));
  const parsedIndex = parsePackIndex(index);
  for (const pack of index.packs) {
    const bytes = fs.readFileSync(path.join(packPath, `pack-${pack.id}-${pack.hash}.tar.gz`));
    assert.equal(bytes.length, pack.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), pack.integrity);
  }
  const koma = index.packs.find((pack) => pack.id === 'koma-script');
  assert.ok(koma, 'KOMA-Script muss im Paketindex stehen.');
  assert.equal(index.provides['scrbook.cls'], 'koma-script');
  assert.equal(resolveMissing(parsedIndex, ['scrbook.cls'], []).packs[0]?.id, 'koma-script');
  const probes = resolveMissing(parsedIndex, ['main.aux', 'footmisc.sty.aux', 'lmroman10-regular.ttf'], []);
  assert.deepEqual(probes.packs, [], 'Harmlose TeX-Suchproben dürfen keine Paketdownloads auslösen.');

  const archive = new Uint8Array(fs.readFileSync(path.join(packPath, `pack-koma-script-${koma.hash}.tar.gz`)));
  assert.equal(archive.byteLength, koma.bytes);
  assert.equal(createHash('sha256').update(archive).digest('hex'), koma.integrity);
  const [wasm, bundle, packageFiles] = await Promise.all([
    fs.promises.readFile(path.join(enginePath, 'tectonic_wasm.wasm')),
    unpackTarGz(new Uint8Array(fs.readFileSync(path.join(enginePath, 'tectonic-bundle.tar.gz')))),
    unpackTarGz(archive)
  ]);
  const compiler = await TexEngine.load(new Uint8Array(wasm));
  compiler.addFiles(bundle);
  compiler.addFiles(packageFiles);
  compiler.addFile('main.tex', '\\documentclass{scrbook}\n\\begin{document}Hello\\end{document}');

  const result = compiler.compile({ entry: 'main.tex', haltOnError: false, shellEscape: false, synctex: false });
  assert.notEqual(result.status, 'failed', result.message || 'scrbook-Kompilierung ist fehlgeschlagen.');
  assert.ok(compiler.output('main.pdf')?.length > 0, 'scrbook muss eine PDF-Datei erzeugen.');
});
