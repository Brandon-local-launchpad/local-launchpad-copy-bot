'use strict';

// Where pushes keep their snapshots (what the site held before) and their log.
// Memory for tests; files for the command line (.wp-push/, git-ignored). The
// server will use the database (slice 4).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function createMemoryStore() {
  const snapshots = new Map();
  const log = [];
  return {
    async saveSnapshot(s) { const id = crypto.randomUUID(); snapshots.set(id, JSON.parse(JSON.stringify(s))); return id; },
    async getSnapshot(id) { const s = snapshots.get(id); return s ? JSON.parse(JSON.stringify(s)) : null; },
    async appendLog(entry) { log.push({ at: new Date().toISOString(), ...entry }); },
    async listLog() { return log.slice(); },
  };
}

function createFileStore(dir) {
  fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
  const logFile = path.join(dir, 'push-log.jsonl');
  return {
    async saveSnapshot(s) { const id = crypto.randomUUID(); fs.writeFileSync(path.join(dir, 'snapshots', `${id}.json`), JSON.stringify(s, null, 2)); return id; },
    async getSnapshot(id) {
      if (!/^[0-9a-f-]{36}$/.test(id)) return null;
      const f = path.join(dir, 'snapshots', `${id}.json`);
      return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
    },
    async appendLog(entry) { fs.appendFileSync(logFile, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n'); },
    async listLog() { return fs.existsSync(logFile) ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)) : []; },
  };
}

module.exports = { createMemoryStore, createFileStore };
