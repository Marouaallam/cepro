/* Shared helpers for the admin API (files under api/_lib are not exposed as routes). */
'use strict';

const crypto = require('crypto');

const COOKIE_NAME = 'cepro_admin';
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function env(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim() ? v.trim() : '';
}

function missingConfig() {
  return ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'ADMIN_PASSWORD', 'ADMIN_SESSION_SECRET']
    .filter((k) => !env(k));
}

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function sign(data) {
  return b64url(crypto.createHmac('sha256', env('ADMIN_SESSION_SECRET')).update(data).digest());
}

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function createSessionCookie() {
  const payload = b64url(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS }));
  const token = payload + '.' + sign(payload);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  const parts = header.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) return part.slice(idx + 1).trim();
  }
  return '';
}

function isAuthenticated(req) {
  if (!env('ADMIN_SESSION_SECRET')) return false;
  const token = readCookie(req, COOKIE_NAME);
  const dot = token.indexOf('.');
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payload))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Math.floor(Date.now() / 1000);
  } catch (e) {
    return false;
  }
}

/* Guard used by every protected route. Returns true if the request may continue. */
function requireAdmin(req, res) {
  const missing = missingConfig();
  if (missing.length) {
    sendJson(res, 500, { error: 'not_configured', missing });
    return false;
  }
  if (!isAuthenticated(req)) {
    sendJson(res, 401, { error: 'unauthorized' });
    return false;
  }
  return true;
}

/* Call Supabase PostgREST with the secret key (server-side only, bypasses RLS). */
async function supabase(path, options) {
  const key = env('SUPABASE_SECRET_KEY');
  const url = env('SUPABASE_URL').replace(/\/+$/, '') + '/rest/v1/' + path;
  const headers = Object.assign({
    apikey: key,
    Authorization: 'Bearer ' + key,
    Accept: 'application/json'
  }, (options && options.headers) || {});
  return fetch(url, Object.assign({}, options, { headers }));
}

/* Parses "0-49/1234" (Content-Range) → 1234 */
function totalFromContentRange(res) {
  const cr = res.headers.get('content-range') || '';
  const total = cr.split('/')[1];
  return total && total !== '*' ? Number(total) : null;
}

module.exports = {
  env,
  missingConfig,
  sendJson,
  safeEqual,
  createSessionCookie,
  clearSessionCookie,
  isAuthenticated,
  requireAdmin,
  supabase,
  totalFromContentRange
};
