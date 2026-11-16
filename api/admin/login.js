'use strict';

const { env, missingConfig, sendJson, safeEqual, createSessionCookie } = require('../_lib/admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  const missing = missingConfig();
  if (missing.length) return sendJson(res, 500, { error: 'not_configured', missing });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const password = body && typeof body.password === 'string' ? body.password : '';

  if (!password || !safeEqual(password, env('ADMIN_PASSWORD'))) {
    // Small delay to slow down password guessing.
    await new Promise((r) => setTimeout(r, 1000));
    return sendJson(res, 401, { error: 'invalid_password' });
  }

  res.setHeader('Set-Cookie', createSessionCookie());
  return sendJson(res, 200, { ok: true });
};
