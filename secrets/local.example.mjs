// Copy to secrets/local.mjs and fill in. Never commit local.mjs.
export default {
  PW_HASH: {},            // { '<sha256 of ipk|password>': 'doctor', ... } — role passwords
  BACKUP_HASH: '',        // sha256 for the backup endpoint
  IMPORT_KEY: '',         // keep '' on the Iran server; set only for a one-time restore
  SENDER: 'user@example.com',
  APPS_SCRIPT_DEPLOYMENT_ID: '', // Google Apps Script web-app id used by the page
  LF_DEF: { lfdoc: '', lflab: '' } // default lab-feedback password hashes (PBKDF2)
};
