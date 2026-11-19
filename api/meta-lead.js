/* Meta Conversions API — server-side "Lead" event.
   The browser sends only the event_id; the lead is re-read from Supabase so
   nobody can push fake leads to Meta. Personal data is SHA-256 hashed. */
'use strict';

const crypto = require('crypto');
const { env, sendJson, supabase } = require('./_lib/admin');

const MAX_LEAD_AGE_MS = 60 * 60 * 1000; // only send leads created in the last hour

const sha256 = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const normName = (v) => String(v || '').trim().toLowerCase().replace(/[\s'’\-.]/g, '');

function readCookie(req, name) {
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch (e) { return ''; }
    }
  }
  return '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }

  const pixelId = env('META_PIXEL_ID');
  const token = env('META_CAPI_ACCESS_TOKEN');
  if (!pixelId || !token || !env('SUPABASE_URL') || !env('SUPABASE_SECRET_KEY')) {
    return sendJson(res, 500, { error: 'not_configured' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const eventId = body && typeof body.event_id === 'string' ? body.event_id.trim().slice(0, 100) : '';
  if (!eventId) return sendJson(res, 400, { error: 'missing_event_id' });

  try {
    // 1. The lead must really exist in Supabase
    const table = env('SUPABASE_TABLE') || 'leads';
    const r = await supabase(`${table}?event_id=eq.${encodeURIComponent(eventId)}&select=*&limit=1`);
    const rows = r.ok ? await r.json() : [];
    const lead = Array.isArray(rows) ? rows[0] : null;
    if (!lead || lead.consent !== true) return sendJson(res, 404, { error: 'lead_not_found' });

    const created = new Date(lead.created_at || lead.submitted_at).getTime();
    if (!Number.isFinite(created) || Date.now() - created > MAX_LEAD_AGE_MS) {
      return sendJson(res, 410, { error: 'lead_too_old' });
    }

    // 2. Matching data (hashed where Meta requires it)
    const tracking = lead.tracking || {};
    let fbc = readCookie(req, '_fbc');
    if (!fbc && tracking.fbclid) fbc = `fb.1.${created}.${tracking.fbclid}`;
    const fbp = readCookie(req, '_fbp');
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();

    const userData = {
      ph: [sha256(String(lead.phone).replace(/\D/g, ''))], // +213555123456 → 213555123456
      fn: [sha256(normName(lead.first_name))],
      ln: [sha256(normName(lead.last_name))],
      country: [sha256('dz')]
    };
    if (ip) userData.client_ip_address = ip;
    if (req.headers['user-agent']) userData.client_user_agent = req.headers['user-agent'];
    if (fbc) userData.fbc = fbc;
    if (fbp) userData.fbp = fbp;

    const event = {
      event_name: 'Lead',
      event_time: Math.floor(created / 1000),
      event_id: lead.event_id, // same ID as the browser Pixel → Meta deduplicates
      action_source: 'website',
      user_data: userData,
      custom_data: { content_name: lead.residence, content_category: lead.apartment_type }
    };
    if (tracking.page_url) event.event_source_url = tracking.page_url;

    const payload = { data: [event] };
    if (env('META_TEST_EVENT_CODE')) payload.test_event_code = env('META_TEST_EVENT_CODE');

    // 3. Send to Meta
    const version = env('META_API_VERSION') || 'v23.0';
    const metaRes = await fetch(
      `https://graph.facebook.com/${version}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    );
    const result = await metaRes.json().catch(() => ({}));
    if (!metaRes.ok) {
      // Log Meta's error message only — never the lead's personal data
      console.error('[meta-lead] Meta error:', result && result.error ? result.error.message : metaRes.status);
      return sendJson(res, 502, { error: 'meta_error' });
    }
    return sendJson(res, 200, { ok: true, events_received: result.events_received });
  } catch (e) {
    console.error('[meta-lead] Unexpected error:', e && e.message);
    return sendJson(res, 500, { error: 'server_error' });
  }
};
