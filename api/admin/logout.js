'use strict';

const { sendJson, clearSessionCookie } = require('../_lib/admin');

module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }
  res.setHeader('Set-Cookie', clearSessionCookie());
  return sendJson(res, 200, { ok: true });
};
