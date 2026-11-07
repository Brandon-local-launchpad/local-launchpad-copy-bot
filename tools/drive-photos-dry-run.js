'use strict';
// Read a client's sorted photos from real Drive and print what Copybot would show. Read only, and it
// writes nothing to any database.
//   GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE=<key file> node tools/drive-photos-dry-run.js "<Drive folder link>"

const { createDrive, parseFolderId, configured } = require('../drive/client');
const { readClientPhotos, DRIP_ROOT } = require('../drive/photos');

(async () => {
  const folderId = parseFolderId(process.argv[2]);
  if (!folderId) throw new Error('Give the Drive folder link: node tools/drive-photos-dry-run.js "<link>"');
  if (!configured()) throw new Error('Set GOOGLE_DRIVE_SERVICE_ACCOUNT_FILE to the path of the key file.');
  const t0 = Date.now();
  const r = await readClientPhotos({ drive: createDrive(), folderId });
  console.log(`"${r.folder_name}": ${r.files.length} photos, ${Date.now() - t0} ms`);
  for (const f of r.folders) console.log(`  Posts / ${f.label}: ${r.files.filter(x => x.kind === 'post' && x.folder_id === f.id).length}`);
  console.log(`  ${DRIP_ROOT}: ${r.drip_found ? r.files.filter(x => x.kind === 'drip').length : 'no folder'}`);
  const bad = r.files.filter(f => f.problem);
  console.log(`With a problem: ${bad.length}`);
  for (const f of bad.slice(0, 20)) console.log(`  ${f.label} / ${f.name}: ${f.problem}`);
  const types = {};
  for (const f of r.files) types[f.mime_type] = (types[f.mime_type] || 0) + 1;
  console.log('Types:', types, '| largest MB:', (Math.max(0, ...r.files.map(f => f.size_bytes)) / 1048576).toFixed(1), '| with dimensions:', r.files.filter(f => f.width).length);
  for (const m of [...r.problems, ...r.notes]) console.log('Note:', m);
})().catch(e => { console.error(e.message); process.exit(1); });
