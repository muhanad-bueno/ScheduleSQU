// Copies the built site (app/dist) into the repo root, where GitHub Pages
// serves it straight from branch main — no CI build step involved.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const ROOT = path.join(__dirname, '..');

if (!fs.existsSync(DIST)) {
    console.error('dist/ not found — run `npm run build` first.');
    process.exit(1);
}

// Remove previously shipped output before copying the fresh build,
// so stale hashed asset files don't pile up in assets/.
const SHIPPED_ENTRIES = ['assets', 'index.html', 'data.json', 'favicon.svg', 'vite.svg'];
for (const entry of SHIPPED_ENTRIES) {
    const target = path.join(ROOT, entry);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
}

fs.cpSync(DIST, ROOT, { recursive: true });

console.log('Shipped app/dist/ -> repo root. Review with `git status`, then commit + push.');
