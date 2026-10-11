'use strict';
const path = require('node:path');
const fs = require('node:fs');
const instrument = require('./instrument.json');
const requiredStudyFields = {
  STUDY_ID:'studyId', CONSENT_VERSION:'consentVersion', STUDY_INFORMATION:'information',
  STUDY_CONSENT_TEXT:'consentText', RESEARCHER_CONTACT:'researcherContact',
  STUDY_RETENTION:'retention', STUDY_WITHDRAWAL:'withdrawal', STUDY_ELIGIBILITY:'eligibility',
  STUDY_ETHICS_REFERENCE:'ethicsReference'
};
function loadConfig(env, root) {
  const problems = [];
  let origin = null;
  try {
    const u = new URL(env.APP_ORIGIN);
    if (u.origin !== env.APP_ORIGIN || u.username || u.password) throw Error();
    const local = ['localhost','127.0.0.1','[::1]'].includes(u.hostname);
    if (u.protocol !== 'https:' && !(env.NODE_ENV !== 'production' && local && u.protocol === 'http:')) throw Error();
    origin = u.origin;
  } catch { problems.push('APP_ORIGIN must be the exact HTTPS application origin (local HTTP only in development).'); }
  const adminConfigured = Boolean(env.ADMIN_USERNAME && /^[a-zA-Z0-9_.@-]{3,100}$/.test(env.ADMIN_USERNAME) &&
    /^[a-f0-9]{32,128}$/i.test(env.ADMIN_PASSWORD_SALT || '') && /^[a-f0-9]{128}$/i.test(env.ADMIN_PASSWORD_SCRYPT || ''));
  if (!adminConfigured) problems.push('Researcher authentication is not configured.');
  let databasePath = null;
  if (env.RESEARCH_DATABASE_PATH) {
    const candidate = path.resolve(env.RESEARCH_DATABASE_PATH);
    const realRoot = fs.realpathSync(root);
    try {
      const parent = fs.realpathSync(path.dirname(candidate));
      const actual = path.join(parent,path.basename(candidate));
      if (!path.isAbsolute(env.RESEARCH_DATABASE_PATH) || candidate === ':memory:' || actual === realRoot || actual.startsWith(realRoot + path.sep) || fs.lstatSync(parent).isSymbolicLink()) throw Error();
      if (fs.existsSync(candidate) && (fs.lstatSync(candidate).isSymbolicLink() || !fs.statSync(candidate).isFile())) throw Error();
      if (env.RESEARCH_PERSISTENT_VOLUME_CONFIRMED !== 'true') throw Error();
      databasePath = actual;
    } catch { problems.push('Database must be a regular file in an existing, explicitly confirmed persistent directory outside the web root.'); }
  } else problems.push('Durable research storage is not configured.');
  const study = {};
  for (const [key, field] of Object.entries(requiredStudyFields)) {
    study[field] = String(env[key] || '').trim();
    if (!study[field]) problems.push(`${key} has not been supplied.`);
  }
  if (study.studyId && !/^[a-zA-Z0-9_-]{1,80}$/.test(study.studyId)) problems.push('STUDY_ID must be a safe study code, not a person identifier.');
  if (env.RESEARCH_ETHICS_APPROVED !== 'true') problems.push('Institutional approval has not been confirmed.');
  if (env.RESEARCH_SECURITY_REVIEWED !== 'true') problems.push('Secure hosting, access, logs, retention and backup review has not been confirmed.');
  const requested = env.RESEARCH_COLLECTION_ENABLED === 'true';
  return {origin, adminConfigured, databasePath, study, instrument, problems,
    enabled: requested && problems.length === 0,
    requested, production:env.NODE_ENV === 'production',
    adminUsername:env.ADMIN_USERNAME || '', salt:env.ADMIN_PASSWORD_SALT || '', passwordHash:env.ADMIN_PASSWORD_SCRYPT || ''};
}
module.exports = { loadConfig };
