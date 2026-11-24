// Copy to secrets/local.mjs and fill in. Never commit local.mjs.
export default {
  PW_HASH: {},            // { '<sha256 of ipk|password>': 'doctor', ... } — role passwords
  BACKUP_HASH: '',        // sha256 for the backup endpoint
  IMPORT_KEY: '',         // Iran server: keep ''
  IMPORT_KEY_CF: '',      // Cloudflare copy: the key the nightly copy uses (build with --target cloudflare)
  PHONES: { '09120000001': '', '09120000002': '' }, // real numbers for the placeholders in the defaults / page (Latin digits)
  SENDER: 'user@example.com',  // sender address shown in the page and used by the server
  EMAIL_HINT: '',          // example address in the settings e-mail field
  APPS_SCRIPT_DEPLOYMENT_ID: '', // Google Apps Script web-app id used by the page
  LF_DEF: { lfdoc: '', lflab: '' } // default lab-feedback password hashes (PBKDF2)
};
