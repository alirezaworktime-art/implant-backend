// Copies the embedded source copy (the line «const CODE={…};») from a deployed bundle into secrets/code.txt (git-ignored).
// The daily backup (action backup → code.files) and the laptop backup task rely on it; it is not in git because it holds
// the October source tree with values that are kept out of the public repo. Contents are never printed.
// Usage: node scripts/code-from-bundle.mjs <deployed bundle>      then build-bundle.mjs puts the line back automatically.
import fs from 'node:fs'; import path from 'node:path'; import url from 'node:url'; import crypto from 'node:crypto';
const root = path.join(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const [b] = process.argv.slice(2); if (!b) { console.error('usage: node scripts/code-from-bundle.mjs <deployed bundle>'); process.exit(2); }
const s = fs.readFileSync(b, 'utf8');
const n = s.split('\nconst CODE=').length - 1; if (n !== 1) { console.error('expected exactly one CODE line, found ' + n); process.exit(1); }
const c = s.indexOf('\nconst CODE=') + 1, e = s.indexOf('\n', c), line = s.slice(c, e);
const prev = s.slice(s.lastIndexOf('\n', c - 2) + 1, c - 1);
if (!prev.startsWith('const BACKUP_HASH=')) { console.error('CODE is not right after the BACKUP_HASH line; build-bundle.mjs would put it elsewhere'); process.exit(1); }
fs.mkdirSync(path.join(root, 'secrets'), { recursive: true });
fs.writeFileSync(path.join(root, 'secrets', 'code.txt'), line);
console.log('secrets/code.txt written:', line.length, 'chars, md5', crypto.createHash('md5').update(line).digest('hex'));
