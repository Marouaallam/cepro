'use strict';

const { env, sendJson, requireAdmin, supabase, totalFromContentRange } = require('../_lib/admin');

async function count(table, filter) {
  const qs = 'select=id' + (filter ? '&' + filter : '');
  const r = await supabase(encodeURIComponent(table) + '?' + qs, {
    method: 'HEAD',
    headers: { Prefer: 'count=exact', Range: '0-0' }
  });
  if (!r.ok) throw new Error('Supabase ' + r.status);
  return totalFromContentRange(r) || 0;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { error: 'method_not_allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const table = env('SUPABASE_TABLE') || 'leads';

  // "Today" and "last 7 days" in Algiers time (UTC+1, no DST).
  const nowAlgiers = new Date(Date.now() + 60 * 60 * 1000);
  const todayYmd = nowAlgiers.toISOString().slice(0, 10);
  const weekAgo = new Date(nowAlgiers);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
  const weekYmd = weekAgo.toISOString().slice(0, 10);
  const since = (ymd) => 'created_at=gte.' + encodeURIComponent(ymd + 'T00:00:00+01:00');

  try {
    const [total, today, week, prestige, signature] = await Promise.all([
      count(table, ''),
      count(table, since(todayYmd)),
      count(table, since(weekYmd)),
      count(table, 'residence=eq.prestige'),
      count(table, 'residence=eq.signature')
    ]);
    return sendJson(res, 200, { total, today, week, prestige, signature });
  } catch (e) {
    console.error('[admin/stats] failed', e);
    return sendJson(res, 502, { error: 'supabase_error' });
  }
};
