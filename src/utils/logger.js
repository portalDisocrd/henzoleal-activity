const { sanitizeLogValue } = require("../security/security-utils");
function log(level, event, fields = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(fields || {})) {
    if (/token|password|secret|credential|cookie/i.test(key)) continue;
    safe[key] = typeof value === "string" ? sanitizeLogValue(value, 160) : value;
  }
  const entry = { timestamp: new Date().toISOString(), level, event, ...safe };
  const out = JSON.stringify(entry);
  (level === "error" ? console.error : level === "warn" ? console.warn : console.log)(out);
}
module.exports = { log };
