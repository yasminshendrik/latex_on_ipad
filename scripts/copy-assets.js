const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { gzipSync } = require('node:zlib');
const { TexEngine, unpackTarGz } = require('glyphtex-engine');

const root = path.join(__dirname, '..');
const modules = path.join(root, 'node_modules');
const engine = path.join(modules, 'glyphtex-engine/wasm');
const output = path.join(root, 'js/engine');
const packOutput = path.join(output, 'packs');
const komaSource = JSON.parse(fs.readFileSync(path.join(__dirname, 'koma-script-pack.json'), 'utf8'));
const babelSource = JSON.parse(fs.readFileSync(path.join(__dirname, 'babel-packs.json'), 'utf8'));
const hyphenSource = {
  revision: '365ad220d93cc3bd03d103a89b061564a3891fe1',
  files: {
    'patterns/tex/hyph-de-1996.tex': 'e89b1b590aa609d408abb5871132ebfd43fdfbaa',
    'loadhyph/loadhyph-de-1996.tex': '0ed889f49163db3079c4e22504d81087e07c96ce'
  }
};

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function gitBlobSha(bytes) {
  return crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
}

async function fetchBytes(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'latex-on-ipad-asset-builder' },
    signal: AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`Paketdatei konnte nicht geladen werden (HTTP ${response.status}).`);
  return Buffer.from(await response.arrayBuffer());
}

function tarEntry(name, bytes) {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  header.write('0000644\0', 100, 8, 'ascii');
  header.write('0000000\0', 108, 8, 'ascii');
  header.write('0000000\0', 116, 8, 'ascii');
  header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii');
  header.write('00000000000\0', 136, 12, 'ascii');
  header.fill(0x20, 148, 156);
  header[156] = '0'.charCodeAt(0);
  header.write('ustar\0', 257, 6, 'ascii');
  header.write('00', 263, 2, 'ascii');
  const checksum = header.reduce((sum, byte) => sum + byte, 0);
  header.write(`${checksum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii');
  const padding = Buffer.alloc((512 - (bytes.length % 512)) % 512);
  return Buffer.concat([header, bytes, padding]);
}

async function buildKomaPack() {
  const entries = Object.entries(komaSource.files).sort(([left], [right]) => left.localeCompare(right));
  if (!Object.hasOwn(komaSource.files, 'scrbook.cls')) throw new Error('Das fixierte KOMA-Script-Paket enthält kein scrbook.cls.');

  const files = await Promise.all(entries.map(async ([name, expectedSha]) => {
    const url = `https://raw.githubusercontent.com/${komaSource.repository}/${komaSource.revision}/${komaSource.texPath}/${encodeURIComponent(name)}`;
    const bytes = await fetchBytes(url);
    if (gitBlobSha(bytes) !== expectedSha) throw new Error(`Prüfsumme der KOMA-Script-Datei ${name} stimmt nicht.`);
    return { name, bytes };
  }));
  const licenseUrl = `https://raw.githubusercontent.com/${komaSource.repository}/${komaSource.revision}/${komaSource.licensePath}`;
  const license = await fetchBytes(licenseUrl);
  if (gitBlobSha(license) !== komaSource.licenseSha) throw new Error('Prüfsumme der KOMA-Script-Lizenzdatei stimmt nicht.');
  files.push({ name: 'LPPL.txt', bytes: license });

  const tar = Buffer.concat([
    ...files.map(({ name, bytes }) => tarEntry(name, bytes)),
    Buffer.alloc(1024)
  ]);
  return {
    archive: gzipSync(tar, { level: 9, mtime: 0 }),
    files: entries.map(([name]) => name)
  };
}

async function buildBabelPacks(index, integrity) {
  const base = `https://raw.githubusercontent.com/${babelSource.repository}/${babelSource.revision}/${babelSource.basePath}`;
  const lppl = await fetchBytes(`https://raw.githubusercontent.com/${komaSource.repository}/${komaSource.revision}/${komaSource.licensePath}`);
  if (gitBlobSha(lppl) !== komaSource.licenseSha) throw new Error('Prüfsumme der LPPL-Lizenzdatei stimmt nicht.');
  const unicodeLicense = await fetchBytes(babelSource.unicodeLicense.url);
  if (gitBlobSha(unicodeLicense) !== babelSource.unicodeLicense.sha) throw new Error('Prüfsumme der Unicode-Lizenzdatei stimmt nicht.');
  for (const definition of babelSource.packs) {
    const files = await Promise.all(Object.entries(definition.files).map(async ([name, [source, expectedSha]]) => {
      const bytes = await fetchBytes(`${base}/${source}`);
      if (gitBlobSha(bytes) !== expectedSha) throw new Error(`Prüfsumme der Babel-Datei ${name} stimmt nicht.`);
      return { name, bytes };
    }));
    files.push({ name: 'LPPL.txt', bytes: lppl });
    if (definition.id === 'babel-ngerman') files.push({ name: 'UNICODE-LICENSE.txt', bytes: unicodeLicense });
    const archive = gzipSync(Buffer.concat([...files.map(({ name, bytes }) => tarEntry(name, bytes)), Buffer.alloc(1024)]), { level: 9, mtime: 0 });
    const pack = {
      id: definition.id, label: definition.label, description: definition.description,
      packages: [definition.id], requires: definition.requires, optional: true,
      bytes: archive.length, hash: babelSource.version, version: babelSource.version,
      source: `https://github.com/${babelSource.repository}/tree/${babelSource.revision}/${babelSource.basePath}`,
      license: definition.license, integrity: sha256(archive)
    };
    const filename = `pack-${pack.id}-${pack.hash}.tar.gz`;
    fs.writeFileSync(path.join(packOutput, filename), archive);
    integrity[filename] = pack.integrity;
    index.packs.push(pack);
    for (const name of definition.provides) index.provides[name] = pack.id;
    console.log(`${pack.label} (${archive.length} Bytes)`);
  }
}

async function buildEngineBundle() {
  const files = await unpackTarGz(new Uint8Array(fs.readFileSync(path.join(engine, 'tectonic-bundle.tar.gz'))));
  const base = `https://raw.githubusercontent.com/deepin-community/texlive-lang/${hyphenSource.revision}/texmf-dist/tex/generic/hyph-utf8`;
  for (const [source, expectedSha] of Object.entries(hyphenSource.files)) {
    const bytes = await fetchBytes(`${base}/${source}`);
    if (gitBlobSha(bytes) !== expectedSha) throw new Error(`Prüfsumme der Trennmusterdatei ${source} stimmt nicht.`);
    files.set(path.basename(source), bytes);
  }
  const originalLanguage = files.get('language.dat');
  if (!originalLanguage) throw new Error('Das Engine-Bundle enthält keine language.dat.');
  const language = new TextDecoder().decode(originalLanguage);
  if (/^ngerman\s/m.test(language)) throw new Error('Die Sprache ngerman ist bereits im Engine-Bundle registriert.');
  files.set('language.dat', Buffer.from(`${language}\nngerman loadhyph-de-1996.tex\n`));
  const compiler = await TexEngine.load(new Uint8Array(fs.readFileSync(path.join(engine, 'tectonic_wasm.wasm'))));
  compiler.addFiles(files);
  compiler.addFile('glyphtex-format.ini', [
    '\\let\\glyphtexdump\\dump',
    '\\let\\dump\\relax',
    '\\input xelatex.ini',
    '\\ifdefined\\partokencontext\\else \\newcount\\partokencontext \\fi',
    '\\glyphtexdump'
  ].join('\n'));
  const result = compiler.compile({ entry: 'glyphtex-format.ini', jobname: 'latex', initex: true, haltOnError: true });
  const format = compiler.output('latex.fmt');
  if (!format || result.status === 'failed' || result.status === 'errors' ||
      result.diagnostics.some((item) => item.severity === 'error')) {
    throw new Error(`TeX-Format mit deutschen Trennmustern konnte nicht erzeugt werden: ${result.message || result.diagnostics.map((item) => item.message).join('; ')}`);
  }
  files.set('latex.fmt', format);
  const entries = [...files.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  for (const [name] of entries) {
    if (Buffer.byteLength(name) > 100) throw new Error(`Dateiname für das TeX-Archiv ist zu lang: ${name}`);
  }
  const tar = Buffer.concat([...entries.map(([name, bytes]) => tarEntry(name, bytes)), Buffer.alloc(1024)]);
  const archive = gzipSync(tar, { level: 9, mtime: 0 });
  fs.writeFileSync(path.join(output, 'tectonic-bundle.tar.gz'), archive);
  console.log(`TeX-Bundle mit deutschen Trennmustern (${archive.length} Bytes)`);
}

async function main() {
  fs.mkdirSync(packOutput, { recursive: true });
  const jobs = [
    ['glyphtex-engine/wasm/tectonic_wasm.wasm', 'js/engine/tectonic_wasm.wasm'],
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

  await buildEngineBundle();
  const sourceIndex = JSON.parse(fs.readFileSync(path.join(engine, 'packs/packs-index.json'), 'utf8'));
  const index = {
    ...sourceIndex,
    packs: sourceIndex.packs.map((pack) => ({ ...pack })),
    provides: { ...sourceIndex.provides }
  };
  const integrity = {};
  for (const pack of index.packs) {
    const filename = `pack-${pack.id}-${pack.hash}.tar.gz`;
    const bytes = fs.readFileSync(path.join(engine, 'packs', `pack-${pack.id}.tar.gz`));
    fs.writeFileSync(path.join(packOutput, filename), bytes);
    pack.bytes = bytes.length;
    pack.integrity = sha256(bytes);
    integrity[filename] = pack.integrity;
  }

  const koma = await buildKomaPack();
  const komaPack = {
    id: 'koma-script',
    label: 'KOMA-Script',
    description: 'KOMA-Script 3.43 mit Dokumentklassen, Laufzeitpaketen und LPPL-Lizenzdatei.',
    packages: ['koma-script'],
    requires: [],
    optional: true,
    bytes: koma.archive.length,
    hash: komaSource.version,
    version: komaSource.version,
    source: `https://github.com/${komaSource.repository}/tree/${komaSource.revision}/${komaSource.texPath}`,
    license: 'LPPL 1.3c',
    integrity: sha256(koma.archive)
  };
  const komaFilename = `pack-${komaPack.id}-${komaPack.hash}.tar.gz`;
  fs.writeFileSync(path.join(packOutput, komaFilename), koma.archive);
  integrity[komaFilename] = komaPack.integrity;
  index.packs.push(komaPack);
  for (const filename of koma.files) index.provides[filename] = komaPack.id;

  await buildBabelPacks(index, integrity);
  fs.writeFileSync(path.join(packOutput, 'packs-index.json'), `${JSON.stringify(index)}\n`);
  fs.writeFileSync(path.join(packOutput, 'packs-integrity.json'), `${JSON.stringify(integrity)}\n`);
  console.log(`KOMA-Script ${komaSource.version} (${koma.files.length} Dateien; ${koma.archive.length} Bytes)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
