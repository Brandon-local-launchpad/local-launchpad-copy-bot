'use strict';

// ── Lead Snap autopost storage ───────────────────────────────────────────────
// Two client_assets rows per client, updated in place, as the GBP tab keeps its record:
// the config ('leadsnap_autopost') and the fields typed on the tab ('leadsnap_autopost_hand').

const parse = c => (typeof c === 'string' ? JSON.parse(c) : c);

function createAutopostStore(pool) {
  const read = async (type, clientId) => {
    const { rows } = await pool.query(`SELECT id, content FROM client_assets WHERE client_id=$1 AND asset_type='${type}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    return rows.length ? parse(rows[0].content) : null;
  };
  const put = async (type, filename, clientId, data) => {
    const content = JSON.stringify(data);
    const { rows } = await pool.query(`SELECT id FROM client_assets WHERE client_id=$1 AND asset_type='${type}' ORDER BY uploaded_at DESC LIMIT 1`, [clientId]);
    if (rows.length) await pool.query(`UPDATE client_assets SET content=$1, uploaded_at=NOW() WHERE id=$2`, [content, rows[0].id]);
    else await pool.query(`INSERT INTO client_assets (client_id, asset_type, filename, content) VALUES ($1, '${type}', $2, $3)`, [clientId, filename, content]);
  };
  return {
    latest: clientId => read('leadsnap_autopost', clientId),
    save: (clientId, record) => put('leadsnap_autopost', 'leadsnap_autopost.json', clientId, record),
    hand: async clientId => (await read('leadsnap_autopost_hand', clientId)) || {},
    saveHand: (clientId, data) => put('leadsnap_autopost_hand', 'leadsnap_autopost_hand.json', clientId, data),
  };
}

module.exports = { createAutopostStore };
