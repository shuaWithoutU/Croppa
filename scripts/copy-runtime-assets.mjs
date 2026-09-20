import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = join(root, 'public');
const tesseractRoot = join(publicRoot, 'tesseract');
const coreTarget = join(tesseractRoot, 'core');
const languageTarget = join(tesseractRoot, 'lang');

await rm(tesseractRoot, { recursive: true, force: true });
await rm(join(publicRoot, 'ort'), { recursive: true, force: true });

await Promise.all([
  mkdir(coreTarget, { recursive: true }),
  mkdir(languageTarget, { recursive: true }),
]);

await cp(
  join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'),
  join(tesseractRoot, 'worker.min.js'),
);
await cp(
  join(
    root,
    'node_modules',
    '@tesseract.js-data',
    'chi_sim',
    '4.0.0_best_int',
    'chi_sim.traineddata.gz',
  ),
  join(languageTarget, 'chi_sim.traineddata.gz'),
);

const coreSource = join(root, 'node_modules', 'tesseract.js-core');
const coreFiles = (await readdir(coreSource)).filter((name) => name.endsWith('.wasm.js'));
await Promise.all(coreFiles.map((name) => cp(join(coreSource, name), join(coreTarget, name))));

if (coreFiles.length === 0) {
  throw new Error('No local Tesseract core assets were found.');
}
