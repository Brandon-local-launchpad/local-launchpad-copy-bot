'use strict';

// ── Drive photos for one client ──────────────────────────────────────────────
//   refresh(clientId, folderText)   read the folder in Drive and save what it holds. A failure is
//                                   saved beside the last good read, never thrown, so the tab can show it.
//   viewFor(read, folderText, ...)  what the Lead Snap tab draws
// getDrive is a function so a server with no key still loads: the read says what is missing.

const { parseFolderId, configured } = require('./client');
const { readClientPhotos, driveActive, matchNotes, DRIP_ROOT } = require('./photos');

function createDrivePhotos({ store, getDrive, log = console }) {
  async function refresh(clientId, folderText) {
    const folderId = parseFolderId(folderText);
    if (!folderId) { await store.saveError(clientId, 'The Drive photo folder is not a Drive folder link.'); return store.read(clientId); }
    try {
      const result = await readClientPhotos({ drive: getDrive(), folderId });
      await store.saveRead(clientId, result);
      log.log(`[drive] ${clientId}: ${result.files.length} photos in "${result.folder_name}"`);
    } catch (e) {
      if (!e.status) log.error('[drive]', e);
      await store.saveError(clientId, e.message);
    }
    return store.read(clientId);
  }
  return { refresh, read: clientId => store.read(clientId) };
}

// The folders with their files, in the tab's order: the labels, Brand, Photo Drip
function viewFor({ read, folderText, groups, env = process.env }) {
  const folderId = parseFolderId(folderText);
  const active = driveActive(read, folderId);
  const usable = !!(read && read.last_ok_at && read.folder_id === folderId);
  const files = usable ? read.files : [];
  const listOf = (kind, label) => files.filter(f => f.kind === kind && f.label === label);
  const folders = usable ? read.folders.map(f => ({ label: f.label, files: listOf('post', f.label) })) : [];
  return {
    configured: configured(env), folder: folderText || '', folder_valid: !!folderId, active,
    last_ok_at: read ? read.last_ok_at : null, last_try_at: read ? read.last_try_at : null, stale_folder: !!(read && read.last_ok_at && folderId && read.folder_id !== folderId),
    error: read ? read.error : null, folder_name: usable ? read.folder_name : '',
    folders, drip: { label: DRIP_ROOT, found: usable && read.drip_found, files: files.filter(f => f.kind === 'drip') },
    total: files.length,
    problems: usable ? read.problems : [], notes: usable ? [...read.notes, ...(active && groups ? matchNotes(groups, read) : [])] : [],
  };
}

module.exports = { createDrivePhotos, viewFor };
