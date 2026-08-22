/**
 * server/services/auditLogger.js — Immutable Audit Logging Engine
 * Append-only record keeping of all administrative, inventory, and financial changes.
 */

const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');

const LOCAL_AUDIT_LOG_FILE = path.join(__dirname, '../../scratch/audit_logs.json');

// In-memory cache of recent audit logs
let inMemoryAuditLogs = [];

function ensureLocalFile() {
  try {
    const dir = path.dirname(LOCAL_AUDIT_LOG_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(LOCAL_AUDIT_LOG_FILE)) {
      fs.writeFileSync(LOCAL_AUDIT_LOG_FILE, JSON.stringify([]));
    } else {
      const raw = fs.readFileSync(LOCAL_AUDIT_LOG_FILE, 'utf8');
      inMemoryAuditLogs = JSON.parse(raw || '[]');
    }
  } catch (e) {
    inMemoryAuditLogs = [];
  }
}

ensureLocalFile();

/**
 * Log an immutable administrative action
 */
async function logAuditEvent({
  actorUserId = null,
  actorName = 'System / Admin',
  actorEmail = 'admin@veyano.in',
  actorRole = 'OWNER',
  action,
  entityType,
  entityId = null,
  entityName = null,
  previousValue = null,
  newValue = null,
  reason = null,
  ipAddress = null,
  userAgent = null,
  sessionId = null
}) {
  const timestamp = new Date().toISOString();
  const eventId = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const entry = {
    id: eventId,
    event_id: eventId,
    timestamp,
    actor_user_id: actorUserId,
    actor_name: actorName,
    actor_email: actorEmail,
    actor_role: actorRole,
    action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    previous_value: previousValue,
    new_value: newValue,
    reason: reason || 'Routine operational update',
    ip_address: ipAddress,
    user_agent: userAgent,
    session_id: sessionId
  };

  // 1. In-memory append
  inMemoryAuditLogs.unshift(entry);
  if (inMemoryAuditLogs.length > 2000) inMemoryAuditLogs = inMemoryAuditLogs.slice(0, 2000);

  // 2. Persist locally to scratch/audit_logs.json
  try {
    fs.writeFileSync(LOCAL_AUDIT_LOG_FILE, JSON.stringify(inMemoryAuditLogs, null, 2));
  } catch (e) {
    console.warn('[AuditLog] Local persist note:', e.message);
  }

  // 3. Persist to Supabase audit_logs table if accessible
  try {
    await supabase.from('audit_logs').insert([entry]);
  } catch (e) {
    // Non-blocking fallback
  }

  return entry;
}

/**
 * Query audit logs with pagination and filters
 */
async function getAuditLogs({ limit = 50, offset = 0, entityType, actorEmail, action, search } = {}) {
  // Try Supabase first
  try {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (entityType) query = query.eq('entity_type', entityType);
    if (actorEmail) query = query.eq('actor_email', actorEmail);
    if (action) query = query.eq('action', action);

    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return { data, total: data.length };
    }
  } catch (e) {
    // Fall back to in-memory / local file
  }

  let results = inMemoryAuditLogs;

  if (entityType) {
    results = results.filter(l => l.entity_type === entityType);
  }
  if (actorEmail) {
    results = results.filter(l => (l.actor_email || '').toLowerCase() === actorEmail.toLowerCase());
  }
  if (action) {
    results = results.filter(l => l.action === action);
  }
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(l => 
      (l.entity_name || '').toLowerCase().includes(q) ||
      (l.actor_name || '').toLowerCase().includes(q) ||
      (l.action || '').toLowerCase().includes(q) ||
      (l.reason || '').toLowerCase().includes(q)
    );
  }

  const paginated = results.slice(offset, offset + limit);
  return { data: paginated, total: results.length };
}

module.exports = {
  logAuditEvent,
  getAuditLogs
};
