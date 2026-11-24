// Prints the hash the server stores for a role password (kv 'pw:<role>' or PW_HASH key): sha256('ipk|' + password).
// Usage: node scripts/hash-password.mjs '<password>'
import crypto from 'node:crypto';
const pw = process.argv[2]; if (!pw) { console.error("usage: node scripts/hash-password.mjs '<password>'"); process.exit(2); }
console.log(crypto.createHash('sha256').update('ipk|' + pw).digest('hex'));
