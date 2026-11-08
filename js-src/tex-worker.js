import { EnginePoisonedError, TexEngine, unpackTarGz } from 'glyphtex-engine';

const assetUrl = (name) => new URL(`engine/${name}`, self.location.href).href;

let engine;
let enginePromise;
let projectFiles = new Set();

async function fetchBytes(name) {
  const response = await fetch(assetUrl(name));
  if (!response.ok) throw new Error(`${name} konnte nicht geladen werden (HTTP ${response.status}).`);
  return new Uint8Array(await response.arrayBuffer());
}

function loadEngine() {
  if (!enginePromise) {
    enginePromise = (async () => {
      const [wasm, bundle] = await Promise.all([fetchBytes('tectonic_wasm.wasm'), fetchBytes('tectonic-bundle.tar.gz')]);
      const loaded = await TexEngine.load(wasm);
      loaded.addFiles(await unpackTarGz(bundle));
      projectFiles = new Set();
      engine = loaded;
      return loaded;
    })().catch((error) => {
      enginePromise = undefined;
      throw error;
    });
  }
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

self.onmessage = async ({ data }) => {
  const { id } = data;
  try {
    let loaded = await loadEngine();
    let outcome;
    try {
      outcome = compileOnce(loaded, data);
    } catch (error) {
      if (!(error instanceof EnginePoisonedError)) throw error;
      // Nach einem Trap ist die Instanz unbrauchbar und muss neu aufgebaut werden.
      engine = undefined;
      enginePromise = undefined;
      loaded = await loadEngine();
      outcome = compileOnce(loaded, data);
    }
    const { result, pdf } = outcome;
    const copy = pdf ? pdf.slice().buffer : undefined;
    self.postMessage({
      id,
      status: result.status,
      message: result.message,
      diagnostics: result.diagnostics,
      missingFiles: result.missingFiles,
      pdf: copy
    }, copy ? [copy] : []);
  } catch (error) {
    self.postMessage({ id, error: error && error.message ? error.message : String(error) });
  }
};
