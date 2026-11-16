'use strict';

const { env, sendJson, requireAdmin, supabase, totalFromContentRange } = require('../_lib/admin');

const COLUMNS = 'id,created_at,last_name,first_name,phone,residence,apartment_type,preferred_contact_time,language,consent,tracking';
const MAX_PAGE_SIZE = 100;
const MAX_EXPORT_ROWS = 10000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ALGIERS_OFFSET = '+01:00';

function str(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function nextDay(ymd) {
  const d = new Date(ymd + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function buildFilters(query) {
  const p = new URLSearchParams();

  const residence = str(query.residence);
  if (residence === 'prestige' || residence === 'signature') p.append('residence', 'eq.' + residence);

  const apt = str(query.apartment_type);
  if (/^[A-Za-z0-9 ]{1,20}$/.test(apt)) p.append('apartment_type', 'eq.' + apt);

  const time = str(query.contact_time);
  if (['morning', 'afternoon', 'evening'].includes(time)) p.append('preferred_contact_time', 'eq.' + time);

  const from = str(query.from);
  if (DATE_RE.test(from)) p.append('created_at', 'gte.' + from + 'T00:00:00' + ALGIERS_OFFSET);
  const to = str(query.to);
  if (DATE_RE.test(to)) p.append('created_at', 'lt.' + nextDay(to) + 'T00:00:00' + ALGIERS_OFFSET);

  // Free-text search on name / phone. Strip characters that have meaning in PostgREST filters.
  const q = str(query.q).replace(/[,()*"\\:]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (q) {
    const conds = ['last_name.ilike.*' + q + '*', 'first_name.ilike.*' + q + '*'];
    let digits = q.replace(/\D/g, '');
    if (digits.length >= 3) {
      // Phones are stored as +2135XXXXXXXX: match "0555 12…" or "213555…" too.
      if (digits.indexOf('213') === 0) digits = digits.slice(3);
      digits = digits.replace(/^0/, '');
      conds.push('phone.ilike.*' + digits + '*');
    }
    p.append('or', '(' + conds.join(',') + ')');
  }

  return p;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const query = req.query || {};
  const table = env('SUPABASE_TABLE') || 'leads';
  const isExport = str(query.export) === '1';

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = isExport ? MAX_EXPORT_ROWS : Math.min(MAX_PAGE_SIZE, Math.max(1, parseInt(query.page_size, 10) || 25));
  const offset = isExport ? 0 : (page - 1) * pageSize;

  const params = buildFilters(query);
  params.set('select', COLUMNS);
  params.set('order', 'created_at.desc,id.desc');
  params.set('limit', String(pageSize));
  params.set('offset', String(offset));

  try {
    const r = await supabase(encodeURIComponent(table) + '?' + params.toString(), {
      method: 'GET',
      headers: { Prefer: 'count=exact' }
    });
    if (!r.ok) {
      const detail = await r.text();
      console.error('[admin/leads] Supabase error', r.status, detail);
      return sendJson(res, 502, { error: 'supabase_error', status: r.status });
    }
    const rows = await r.json();
    return sendJson(res, 200, {
      rows,
      total: totalFromContentRange(r),
      page,
      page_size: pageSize
    });
  } catch (e) {
    console.error('[admin/leads] Request failed', e);
    return sendJson(res, 502, { error: 'supabase_unreachable' });
  }
};
