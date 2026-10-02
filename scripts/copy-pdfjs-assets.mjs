// Copies the pdf.js character maps and standard fonts next to the app, where the
// statement reader loads them from ("<base>/pdfjs/..."). Runs before dev and build.

import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'node_modules', 'pdfjs-dist');
const target = join(root, 'public', 'pdfjs');

if (!existsSync(source)) {
  console.error('pdfjs-dist is not installed. Run "npm install" first.');
  process.exit(1);
}

rmSync(target, { recursive: true, force: true });
for (const folder of ['cmaps', 'standard_fonts']) {
  cpSync(join(source, folder), join(target, folder), { recursive: true });
}
console.log('pdf.js assets copied to public/pdfjs');
