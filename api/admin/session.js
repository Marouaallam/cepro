'use strict';

const { missingConfig, sendJson, isAuthenticated } = require('../_lib/admin');

/* Lets the admin page know whether to show the login screen or the dashboard. */
module.exports = function handler(req, res) {
  const missing = missingConfig();
  if (missing.length) return sendJson(res, 500, { error: 'not_configured', missing });
  return sendJson(res, 200, { authenticated: isAuthenticated(req) });
};
