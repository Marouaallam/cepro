/* CEPRO — admin panel for received leads.
   Talks only to /api/admin/* (Vercel functions). The Supabase secret key never reaches the browser. */
(function () {
  'use strict';

  var PAGE_SIZE = 25;

  var LABELS = {
    residence: { prestige: 'Prestige', signature: 'Signature' },
    time: { morning: 'Matin (09–12h)', afternoon: 'Après-midi (12–16h)', evening: 'Fin de journée (16–18h)' },
    lang: { fr: 'FR', ar: 'AR' }
  };

  var $ = function (id) { return document.getElementById(id); };
  var state = { page: 1, total: 0, loading: false };
  var filtersForm = $('filters');

  var dateFmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  /* ---------- helpers ---------- */
  function show(view) {
    ['loginView', 'configView', 'dashView'].forEach(function (id) { $(id).hidden = id !== view; });
  }

  function api(path, options) {
    return fetch('/api/admin/' + path, Object.assign({ credentials: 'same-origin', headers: { Accept: 'application/json' } }, options || {}))
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.status === 401) { show('loginView'); throw { handled: true }; }
          if (res.status === 500 && body.error === 'not_configured') { showConfig(body.missing); throw { handled: true }; }
          if (!res.ok) throw { message: 'Erreur serveur (' + res.status + '). Réessayez dans un instant.' };
          return body;
        });
      });
  }

  function showConfig(missing) {
    var ul = $('missingVars');
    ul.textContent = '';
    (missing || []).forEach(function (name) {
      var li = document.createElement('li');
      li.textContent = name;
      ul.appendChild(li);
    });
    show('configView');
  }

  function showDashError(err) {
    if (err && err.handled) return;
    $('dashError').textContent = (err && err.message) || 'Impossible de contacter le serveur.';
    $('dashError').hidden = false;
  }

  function formatPhone(e164) {
    var m = /^\+213(\d{3})(\d{2})(\d{2})(\d{2})$/.exec(e164 || '');
    return m ? '0' + m[1] + ' ' + m[2] + ' ' + m[3] + ' ' + m[4] : (e164 || '');
  }

  function formatDate(iso) {
    try { return dateFmt.format(new Date(iso)); } catch (e) { return iso || ''; }
  }

  function sourceOf(tracking) {
    tracking = tracking || {};
    var parts = [];
    if (tracking.utm_source) parts.push(tracking.utm_source);
    else if (tracking.fbclid) parts.push('facebook');
    if (tracking.utm_campaign) parts.push(tracking.utm_campaign);
    return parts.join(' · ');
  }

  function filterParams() {
    var params = new URLSearchParams();
    new FormData(filtersForm).forEach(function (value, key) {
      value = String(value).trim();
      if (value) params.append(key, value);
    });
    return params;
  }

  function cell(tr, label, content, className) {
    var td = document.createElement('td');
    td.setAttribute('data-label', label);
    if (className) td.className = className;
    if (content instanceof Node) td.appendChild(content); else td.textContent = content == null ? '' : String(content);
    tr.appendChild(td);
    return td;
  }

  /* ---------- rendering ---------- */
  function renderRows(rows) {
    var tbody = $('rows');
    tbody.textContent = '';
    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      cell(tr, 'Date', formatDate(r.created_at), 'nowrap');
      cell(tr, 'Nom', (r.last_name || '') + ' ' + (r.first_name || ''));

      var a = document.createElement('a');
      a.href = 'tel:' + r.phone;
      a.textContent = formatPhone(r.phone);
      cell(tr, 'Téléphone', a, 'nowrap');

      var tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = LABELS.residence[r.residence] || r.residence;
      cell(tr, 'Résidence', tag);

      cell(tr, 'Appart.', r.apartment_type, 'nowrap');
      cell(tr, 'Créneau', LABELS.time[r.preferred_contact_time] || r.preferred_contact_time);
      cell(tr, 'Langue', LABELS.lang[r.language] || r.language);
      cell(tr, 'Source', sourceOf(r.tracking) || '—');
      tbody.appendChild(tr);
    });
    $('empty').hidden = rows.length > 0;
  }

  function renderPager() {
    var pages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));
    $('pageInfo').textContent = 'Page ' + state.page + ' / ' + pages + ' · ' + state.total + ' demande' + (state.total > 1 ? 's' : '');
    $('prevBtn').disabled = state.page <= 1;
    $('nextBtn').disabled = state.page >= pages;
  }

  /* ---------- data ---------- */
  function loadStats() {
    return api('stats').then(function (s) {
      $('statTotal').textContent = s.total;
      $('statToday').textContent = s.today;
      $('statWeek').textContent = s.week;
      $('statPrestige').textContent = s.prestige;
      $('statSignature').textContent = s.signature;
    }).catch(showDashError);
  }

  var requestSeq = 0;
  function loadLeads() {
    var seq = ++requestSeq;
    var params = filterParams();
    params.set('page', String(state.page));
    params.set('page_size', String(PAGE_SIZE));
    $('dashError').hidden = true;
    return api('leads?' + params.toString()).then(function (data) {
      if (seq !== requestSeq) return; // a newer request is in flight
      state.total = data.total || 0;
      renderRows(data.rows || []);
      renderPager();
    }).catch(showDashError);
  }

  function refresh() {
    show('dashView');
    loadStats();
    return loadLeads();
  }

  /* ---------- CSV export (current filters, up to 10 000 rows) ---------- */
  function csvValue(v) {
    v = v == null ? '' : String(v);
    return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function exportCsv() {
    var btn = $('exportBtn');
    btn.disabled = true;
    var params = filterParams();
    params.set('export', '1');
    api('leads?' + params.toString()).then(function (data) {
      var header = ['Date', 'Nom', 'Prénom', 'Téléphone', 'Résidence', 'Appartement', 'Créneau', 'Langue', 'Consentement',
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
      var lines = [header.join(';')];
      (data.rows || []).forEach(function (r) {
        var t = r.tracking || {};
        lines.push([
          formatDate(r.created_at), r.last_name, r.first_name, r.phone,
          LABELS.residence[r.residence] || r.residence, r.apartment_type,
          LABELS.time[r.preferred_contact_time] || r.preferred_contact_time,
          r.language, r.consent ? 'oui' : 'non',
          t.utm_source, t.utm_medium, t.utm_campaign, t.utm_content, t.utm_term, t.fbclid
        ].map(csvValue).join(';'));
      });
      // BOM so Excel opens accented / Arabic characters correctly
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'cepro-demandes-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
    }).catch(showDashError).then(function () { btn.disabled = false; });
  }

  /* ---------- events ---------- */
  $('loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('loginBtn');
    var errEl = $('loginError');
    errEl.hidden = true;
    btn.disabled = true;
    fetch('/api/admin/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: $('password').value })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) {
        if (res.ok) { $('password').value = ''; return refresh(); }
        if (body.error === 'not_configured') return showConfig(body.missing);
        errEl.textContent = res.status === 401 ? 'Mot de passe incorrect.' : 'Erreur serveur, réessayez.';
        errEl.hidden = false;
      });
    }).catch(function () {
      errEl.textContent = 'Impossible de contacter le serveur.';
      errEl.hidden = false;
    }).then(function () { btn.disabled = false; });
  });

  $('logoutBtn').addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
      .then(function () { show('loginView'); });
  });

  $('refreshBtn').addEventListener('click', refresh);
  $('exportBtn').addEventListener('click', exportCsv);
  $('prevBtn').addEventListener('click', function () { if (state.page > 1) { state.page--; loadLeads(); } });
  $('nextBtn').addEventListener('click', function () { state.page++; loadLeads(); });

  var debounce;
  function onFilterChange() {
    clearTimeout(debounce);
    debounce = setTimeout(function () { state.page = 1; loadLeads(); }, 300);
  }
  filtersForm.addEventListener('input', onFilterChange);
  filtersForm.addEventListener('change', onFilterChange);
  filtersForm.addEventListener('reset', function () { setTimeout(onFilterChange, 0); });
  filtersForm.addEventListener('submit', function (e) { e.preventDefault(); });

  /* ---------- init ---------- */
  fetch('/api/admin/session', { credentials: 'same-origin' })
    .then(function (res) { return res.json().then(function (body) { return { res: res, body: body }; }); })
    .then(function (r) {
      if (r.body.error === 'not_configured') return showConfig(r.body.missing);
      if (r.body.authenticated) return refresh();
      show('loginView');
      $('password').focus();
    })
    .catch(function () { show('loginView'); });
})();
