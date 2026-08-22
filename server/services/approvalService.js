/**
 * server/services/approvalService.js — Approval Workflow Engine
 * Dual-custody review for price changes, MRP updates, and high-impact operations.
 */

const fs = require('fs');
const path = require('path');
const supabase = require('../config/supabase');
const { logAuditEvent } = require('./auditLogger');

const LOCAL_APPROVALS_FILE = path.join(__dirname, '../../scratch/approvals.json');
let inMemoryApprovals = [];

function ensureLocalApprovals() {
  try {
    const dir = path.dirname(LOCAL_APPROVALS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(LOCAL_APPROVALS_FILE)) {
      fs.writeFileSync(LOCAL_APPROVALS_FILE, JSON.stringify([]));
    } else {
      const raw = fs.readFileSync(LOCAL_APPROVALS_FILE, 'utf8');
      inMemoryApprovals = JSON.parse(raw || '[]');
    }
  } catch (e) {
    inMemoryApprovals = [];
  }
}

ensureLocalApprovals();

/**
 * Submit an action to the approval queue
 */
async function createApprovalRequest({
  requestType, // PRICE_CHANGE, MRP_CHANGE, PRODUCT_DELETION, ROLE_PROMOTION, REFUND_HIGH_VALUE, CONFIG_CHANGE
  entityType,
  entityId,
  entityName,
  requestedBy,
  requesterRole,
  requestedChanges, // { old: ..., new: ..., diff: ... }
  reason = ''
}) {
  const timestamp = new Date().toISOString();
  const id = `APPR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const request = {
    id,
    request_type: requestType,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    requested_by: requestedBy,
    requester_role: requesterRole,
    requested_changes: requestedChanges,
    status: 'PENDING',
    reason,
    created_at: timestamp,
    reviewed_by: null,
    reviewer_role: null,
    reviewed_at: null,
    review_remarks: null
  };

  inMemoryApprovals.unshift(request);

  try {
    fs.writeFileSync(LOCAL_APPROVALS_FILE, JSON.stringify(inMemoryApprovals, null, 2));
  } catch (e) {}

  try {
    await supabase.from('approvals').insert([request]);
  } catch (e) {}

  await logAuditEvent({
    actorName: requestedBy,
    actorRole: requesterRole,
    action: 'APPROVAL_REQUESTED',
    entityType,
    entityId,
    entityName,
    previousValue: requestedChanges.old || null,
    newValue: requestedChanges.new || null,
    reason: `Approval requested for ${requestType}: ${reason}`
  });

  return request;
}

/**
 * Get all approval requests (filtered by status)
 */
async function getApprovals({ status = null } = {}) {
  try {
    let query = supabase.from('approvals').select('*').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return data;
    }
  } catch (e) {}

  let results = inMemoryApprovals;
  if (status) results = results.filter(a => a.status === status);
  return results;
}

/**
 * Approve or Reject an approval request
 */
async function reviewApprovalRequest(id, { decision, reviewerName, reviewerRole, remarks = '' }) {
  const target = inMemoryApprovals.find(a => a.id === id);
  if (!target) throw new Error('Approval request not found.');
  if (target.status !== 'PENDING') throw new Error(`Request has already been ${target.status.toLowerCase()}.`);

  target.status = decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  target.reviewed_by = reviewerName;
  target.reviewer_role = reviewerRole;
  target.reviewed_at = new Date().toISOString();
  target.review_remarks = remarks;

  try {
    fs.writeFileSync(LOCAL_APPROVALS_FILE, JSON.stringify(inMemoryApprovals, null, 2));
  } catch (e) {}

  try {
    await supabase
      .from('approvals')
      .update({
        status: target.status,
        reviewed_by: reviewerName,
        reviewer_role: reviewerRole,
        reviewed_at: target.reviewed_at,
        review_remarks: remarks
      })
      .eq('id', id);
  } catch (e) {}

  await logAuditEvent({
    actorName: reviewerName,
    actorRole: reviewerRole,
    action: target.status === 'APPROVED' ? 'APPROVAL_GRANTED' : 'APPROVAL_REJECTED',
    entityType: target.entity_type,
    entityId: target.entity_id,
    entityName: target.entity_name,
    previousValue: target.requested_changes.old || null,
    newValue: target.requested_changes.new || null,
    reason: `Reviewed by ${reviewerName} (${reviewerRole}). Decision: ${target.status}. Remarks: ${remarks || 'None'}`
  });

  return target;
}

module.exports = {
  createApprovalRequest,
  getApprovals,
  reviewApprovalRequest
};
