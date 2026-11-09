const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { createHash, webcrypto } = require('node:crypto');
const vm = require('node:vm');
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

test('Der echte TeX-Worker bietet Babel an und unterscheidet footmisc-Suchproben von Fehlern', async () => {
  const packPath = path.join(root, 'js/engine/packs');
  const index = JSON.parse(fs.readFileSync(path.join(packPath, 'packs-index.json'), 'utf8'));
  const loadPack = (id) => {
    const pack = index.packs.find((item) => item.id === id);
    assert.ok(pack, `${id} fehlt im Index.`);
    return { id, hash: pack.hash, archive: new Uint8Array(fs.readFileSync(path.join(packPath, `pack-${id}-${pack.hash}.tar.gz`))) };
  };
  let response;
  const worker = {
    location: { href: 'https://example.test/js/tex-worker.js' },
    postMessage(data) { response = data; }
  };
  const requests = [];
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/tex-worker.js'), 'utf8'), {
    self: worker, URL, TextDecoder, TextEncoder, Uint8Array, ArrayBuffer, WebAssembly,
    DecompressionStream, Response, Blob, crypto: webcrypto, console,
    fetch: async (url) => {
      requests.push(url);
      const filename = new URL(url).pathname.replace(/^\/js\//, '');
      return new Response(fs.readFileSync(path.join(root, 'js', filename)));
    }
  });
  async function compile(source, packages) {
    response = undefined;
    await worker.onmessage({ data: { id: 1, projectKey: 'projekt/main', entry: 'main.tex', files: { 'main.tex': source }, packages } });
    assert.ok(response, 'Der Worker muss ein Ergebnis zurückgeben.');
    assert.equal(response.error, undefined);
    return response;
  }
  const koma = loadPack('koma-script');
  const plain = '\\documentclass{scrbook}\n\\begin{document}Hallo\\end{document}';
  const normal = await compile(plain, [koma]);
  assert.equal(normal.status, 'spotless');
  assert.ok(normal.pdf?.byteLength > 0);
  assert.ok(!normal.missingFiles.includes('footmisc.sty'));
  assert.ok(!normal.unsupportedFiles.includes('footmisc.sty'));
  assert.equal(normal.missingPacks.length, 0);

  const missingClass = await compile(plain, []);
  assert.equal(missingClass.status, 'failed');
  assert.ok(missingClass.missingPacks.some((pack) => pack.id === 'koma-script'));

  const optional = '\\documentclass{article}\n\\IfFileExists{fancyhdr.sty}{}{}\n\\begin{document}Hallo\\end{document}';
  const optionalSuccess = await compile(optional, []);
  assert.equal(optionalSuccess.status, 'spotless');
  assert.equal(optionalSuccess.missingPacks.length, 0);
  assert.ok(!optionalSuccess.unsupportedFiles.includes('fancyhdr.sty'));
  const optionalWithError = await compile(optional.replace('Hallo', '\\undefinedcommand'), []);
  assert.ok(optionalWithError.diagnostics.some((item) => item.severity === 'error'));
  assert.equal(optionalWithError.missingPacks.length, 0);
  const requiredPackage = await compile(optional.replace('\\IfFileExists{fancyhdr.sty}{}{}', '\\usepackage{fancyhdr}'), []);
  assert.ok(requiredPackage.missingPacks.some((pack) => pack.id === 'writing'));
  const withDependency = await compile(optional.replace('\\IfFileExists{fancyhdr.sty}{}{}', '\\usepackage{float}'), []);
  assert.deepEqual(Array.from(withDependency.missingPacks, (pack) => pack.id), ['writing', 'figures']);

  const explicit = await compile(plain.replace('\\begin{document}', '\\usepackage{footmisc}\n\\begin{document}'), [koma]);
  assert.equal(explicit.status, 'failed');
  assert.ok(explicit.missingFiles.includes('footmisc.sty'));
  assert.ok(explicit.unsupportedFiles.includes('footmisc.sty'));
  assert.match(explicit.diagnostics.map((item) => item.message).join('\n'), /footmisc\.sty/);

  const german = '\\documentclass{scrbook}\n\\usepackage[ngerman]{babel}\n\\begin{document}\\chapter{Einführung} Überprüfung.\\end{document}';
  const before = await compile(german, [koma]);
  assert.equal(before.status, 'failed');
  assert.deepEqual(Array.from(before.missingPacks, (pack) => pack.id), ['babel-nil', 'babel-ngerman']);
  assert.ok(!before.unsupportedFiles.includes('footmisc.sty'));
  assert.ok(!requests.some((url) => /pack-.*\.tar\.gz/.test(url)), 'Der Worker darf keine Paketarchive selbst herunterladen.');

  const offline = await compile(german, [koma, loadPack('babel-nil'), loadPack('babel-ngerman')]);
  assert.equal(offline.status, 'spotless', JSON.stringify(offline.diagnostics));
  assert.ok(offline.pdf?.byteLength > 0);
  assert.equal(offline.missingPacks.length, 0);
  assert.ok(!offline.missingFiles.includes('footmisc.sty'));
  assert.ok(!offline.diagnostics.some((item) => /Silbentrennungsmuster/.test(item.message)));
});

test('Deutsch und Englisch verwenden bei Babel-Sprachwechsel ihre eigenen Trennmuster', async () => {
  const enginePath = path.join(root, 'js/engine');
  const compiler = await TexEngine.load(new Uint8Array(fs.readFileSync(path.join(enginePath, 'tectonic_wasm.wasm'))));
  compiler.addFiles(await unpackTarGz(new Uint8Array(fs.readFileSync(path.join(enginePath, 'tectonic-bundle.tar.gz')))));
  for (const id of ['babel-nil', 'babel-ngerman']) {
    compiler.addFiles(await unpackTarGz(new Uint8Array(fs.readFileSync(path.join(enginePath, 'packs', `pack-${id}-2024-10-24.tar.gz`)))));
  }
  compiler.addFile('main.tex', [
    '\\documentclass{article}',
    '\\usepackage[english,ngerman]{babel}',
    '\\begin{document}',
    '\\selectlanguage{ngerman}\\showhyphens{Silbentrennung Donaudampfschifffahrt representation}',
    '\\selectlanguage{english}\\showhyphens{Silbentrennung Donaudampfschifffahrt representation}',
    'Fertig.\\end{document}'
  ].join('\n'));
  const result = compiler.compile({ entry: 'main.tex', haltOnError: true, shellEscape: false, synctex: false });
  assert.notEqual(result.status, 'failed', result.message);
  assert.ok(!result.diagnostics.some((item) => item.severity === 'error'), JSON.stringify(result.diagnostics));
  assert.ok(compiler.pdf()?.length > 0);
  const log = compiler.log('main');
  assert.match(log, /Sil-ben-tren-nung Do-nau-dampf-schiff-fahrt re-pre-sen-ta-ti-on/);
  assert.match(log, /Sil-ben-tren-nung Donau-dampf-schiff-fahrt rep-re-sen-ta-tion/);
  assert.doesNotMatch(log, /Hyphen rules for ['‘`]ngerman['’`] set to \\l@english/);
});

test('Projektvorgabe kann die Babel-Hauptsprache vor der Dokumentklasse übersteuern', async () => {
  const enginePath = path.join(root, 'js/engine');
  const compiler = await TexEngine.load(new Uint8Array(fs.readFileSync(path.join(enginePath, 'tectonic_wasm.wasm'))));
  compiler.addFiles(await unpackTarGz(new Uint8Array(fs.readFileSync(path.join(enginePath, 'tectonic-bundle.tar.gz')))));
  const index = JSON.parse(fs.readFileSync(path.join(enginePath, 'packs/packs-index.json'), 'utf8'));
  for (const id of ['babel-nil', 'babel-ngerman']) {
    const pack = index.packs.find((item) => item.id === id);
    compiler.addFiles(await unpackTarGz(new Uint8Array(fs.readFileSync(path.join(enginePath, 'packs', `pack-${id}-${pack.hash}.tar.gz`)))));
  }
  compiler.addFile('main.tex', [
    '\\PassOptionsToPackage{main=english}{babel}',
    '\\documentclass{article}',
    '\\usepackage[ngerman]{babel}',
    '\\begin{document}',
    '\\showhyphens{Silbentrennung Donaudampfschifffahrt representation}',
    'Fertig.\\end{document}'
  ].join('\n'));
  const result = compiler.compile({ entry: 'main.tex', haltOnError: false, shellEscape: false, synctex: false });
  assert.notEqual(result.status, 'failed', result.message);
  assert.ok(compiler.pdf()?.length > 0);
  const log = compiler.log('main');
  assert.match(log, /Main language set to 'english'/);
  assert.match(log, /Sil-ben-tren-nung Donau-dampf-schiff-fahrt rep-re-sen-ta-tion/);
});
