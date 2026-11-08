import { EnginePoisonedError, TexEngine, parsePackIndex, resolveMissing, unpackTarGz } from 'glyphtex-engine';

const assetUrl = (name) => new URL(`engine/${name}`, self.location.href).href;

let engine;
let enginePromise;
let engineKey = '';
let packIndex;
let projectFiles = new Set();

async function fetchBytes(name) {
  const response = await fetch(assetUrl(name));
  if (!response.ok) throw new Error(`${name} konnte nicht geladen werden (HTTP ${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

async function loadEngine(projectKey, projectPackages) {
  const requested = projectPackages.slice().sort((left, right) => left.id.localeCompare(right.id));
  const nextKey = `${projectKey}\0${requested.map(({ id, hash }) => `${id}:${hash}`).join('|')}`;
  if (enginePromise && engineKey === nextKey) return enginePromise;
  engine = undefined;
  engineKey = nextKey;
  enginePromise = (async () => {
      const [wasm, bundle, indexBytes] = await Promise.all([
        fetchBytes('tectonic_wasm.wasm'),
        fetchBytes('tectonic-bundle.tar.gz'),
        fetchBytes('packs/packs-index.json')
      ]);
      packIndex = parsePackIndex(JSON.parse(new TextDecoder().decode(indexBytes)));
      const available = requested.filter((installed) => packIndex.packs.some((pack) =>
        pack.id === installed.id && pack.hash === installed.hash
      ));
      const loaded = await TexEngine.load(wasm);
      loaded.addFiles(await unpackTarGz(bundle));
      for (const installed of available) loaded.addFiles(await unpackTarGz(installed.archive));
      projectFiles = new Set();
      engine = loaded;
      return loaded;
    })().catch((error) => {
      if (engineKey === nextKey) {
        enginePromise = undefined;
        engineKey = '';
      }
      throw error;
    });
  return enginePromise;
}

function compileOnce(loaded, { entry, files }) {
  for (const name of projectFiles) loaded.removeFile(name);
  projectFiles = new Set();
  for (const [name, data] of Object.entries(files)) {
    loaded.addFile(name, data);
    projectFiles.add(name);
  }
  loaded.clearOutputs();
  const result = loaded.compile({ entry, haltOnError: false, shellEscape: false, synctex: false });
  const jobname = entry.replace(/\.[^./]+$/, '');
  const pdf = result.status === 'failed' ? undefined : loaded.output(`${jobname}.pdf`);
  return { result, pdf };
}

function actionableMissingFiles(result) {
  const required = new Set();
  for (const diagnostic of result.diagnostics || []) {
    if (diagnostic.severity !== 'error') continue;
    const missing = /File [`'‘]([^'’`]+)['’] not found/i.exec(diagnostic.message || '');
    if (missing) required.add(missing[1]);
    const language = /Package babel Error: Unknown option ['‘`]([a-z-]+)['’`]/i.exec(diagnostic.message || '');
    if (language) {
      required.add(`${language[1]}.ldf`);
      required.add(`babel-${language[1]}.tex`);
    }
  }
  return [...required];
}

self.onmessage = async ({ data }) => {
  const { id } = data;
  try {
    const packages = Array.isArray(data.packages) ? data.packages : [];
    let loaded = await loadEngine(data.projectKey || 'local\0main', packages);
    const activePackages = packages.filter((installed) => packIndex.packs.some((pack) =>
      pack.id === installed.id && pack.hash === installed.hash
    ));
    let outcome;
    try {
      outcome = compileOnce(loaded, data);
    } catch (error) {
      if (!(error instanceof EnginePoisonedError)) throw error;
      // Nach einem Trap ist die Instanz unbrauchbar und muss neu aufgebaut werden.
      engine = undefined;
      enginePromise = undefined;
      engineKey = '';
      loaded = await loadEngine(data.projectKey || 'local\0main', packages);
      outcome = compileOnce(loaded, data);
    }
    const { result, pdf } = outcome;
    const missingFiles = actionableMissingFiles(result);
    const resolution = resolveMissing(packIndex, missingFiles, activePackages);
    const diagnostics = [...(result.diagnostics || [])];
    const jobname = data.entry.replace(/\.[^./]+$/, '');
    if (/Hyphen rules for ['‘`]ngerman['’`] set to \\l@english/.test(loaded.log(jobname) || '')) {
      diagnostics.push({
        severity: 'warning',
        file: null,
        line: null,
        message: 'Für ngerman sind keine deutschen Silbentrennungsmuster in der TeX-Engine vorgeladen; Babel verwendet englische Muster.'
      });
    }
    const copy = pdf ? pdf.slice().buffer : undefined;
    self.postMessage({
      id,
      status: result.status,
      message: result.message,
      diagnostics,
      missingFiles,
      missingPacks: resolution.packs.map((pack) => ({
        id: pack.id,
        label: pack.label,
        bytes: pack.bytes,
        hash: pack.hash,
        integrity: pack.integrity,
        license: pack.license,
        source: pack.source
      })),
      unsupportedFiles: resolution.unsupported,
      pdf: copy
    }, copy ? [copy] : []);
  } catch (error) {
    self.postMessage({ id, error: error && error.message ? error.message : String(error) });
  }
};
