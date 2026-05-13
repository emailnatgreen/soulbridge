/**
 * Investigation Memory Intelligence — Step 9
 * ═════════════════════════════════════════════
 * Pure, deterministic functions for:
 *   1. Timeline extraction — turns an investigation into ordered events
 *   2. Cross-linking — finds recurring patterns across investigations
 *   3. Query — filters investigations by risk, contradiction, phase, visibility, waivers
 *   4. Replay — reconstructs the lifecycle of a single investigation
 *
 * No LLM, no side effects, no state. Governance-safe.
 */

// ═══ 1. Timeline Extraction ═══
// Turns a single investigation into a flat, time-ordered event stream.

export function extractTimeline(investigation) {
  if (!investigation) return [];
  const events = [];
  const ts = investigation.frozen_at || investigation.created_date || new Date().toISOString();

  // Investigation created
  events.push({
    type: 'investigation_created',
    timestamp: ts,
    label: 'Investigation created',
    detail: investigation.question,
    severity: 'info',
  });

  // Risks from L5
  const risks = investigation.leaves?.risk_impact || [];
  risks.forEach((r, i) => {
    events.push({
      type: 'risk_identified',
      timestamp: ts,
      label: `Risk: ${r.title || `Risk #${i + 1}`}`,
      detail: r.description || r.impact_description,
      severity: r.severity || 'medium',
      data: r,
    });
  });

  // Contradictions from L3
  const contras = investigation.leaves?.contradictions || [];
  contras.forEach((c, i) => {
    events.push({
      type: 'contradiction_found',
      timestamp: ts,
      label: `Contradiction: ${c.title || `#${i + 1}`}`,
      detail: c.description,
      severity: c.severity || 'medium',
      data: c,
    });
  });

  // Proposed actions from L6
  const actions = investigation.leaves?.proposed_actions || [];
  actions.forEach((a, i) => {
    events.push({
      type: 'action_proposed',
      timestamp: ts,
      label: `Action: ${a.title || `#${i + 1}`}`,
      detail: a.description,
      severity: a.priority || 'medium',
      data: a,
    });
  });

  // Visibility changes from audit log
  const auditLog = investigation.visibility_audit_log || [];
  auditLog.forEach(entry => {
    events.push({
      type: 'visibility_changed',
      timestamp: entry.timestamp,
      label: `Visibility: ${entry.field} → ${entry.to_state}`,
      detail: entry.reason || `Changed by ${entry.who}`,
      severity: entry.to_state === 'public' || entry.to_state === 'listed' ? 'high' : 'info',
      data: entry,
    });
  });

  // Sovereign signature
  if (investigation.sovereign_signature) {
    events.push({
      type: 'sovereign_signed',
      timestamp: investigation.sovereign_signature.signed_at || ts,
      label: 'Sovereign signature applied',
      detail: `Fingerprint: ${investigation.sovereign_signature.fingerprint}`,
      severity: 'info',
      data: investigation.sovereign_signature,
    });
  }

  // Sort by timestamp
  events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  return events;
}


// ═══ 2. Cross-Linking ═══
// Finds recurring patterns across multiple investigations.

export function crossLinkInvestigations(investigations) {
  if (!investigations || investigations.length === 0) return { risks: [], contradictions: [], waivers: [], patterns: [] };

  const riskMap = {};
  const contraMap = {};
  const waiverMap = {};

  investigations.forEach(inv => {
    const risks = inv.leaves?.risk_impact || [];
    risks.forEach(r => {
      const key = (r.title || '').toLowerCase().trim();
      if (!key) return;
      if (!riskMap[key]) riskMap[key] = { title: r.title, severity: r.severity, occurrences: [], ids: [] };
      riskMap[key].occurrences.push({ investigation_id: inv.id, question: inv.question, severity: r.severity, risk_score: r.risk_score });
      riskMap[key].ids.push(inv.id);
    });

    const contras = inv.leaves?.contradictions || [];
    contras.forEach(c => {
      const key = (c.title || '').toLowerCase().trim();
      if (!key) return;
      if (!contraMap[key]) contraMap[key] = { title: c.title, severity: c.severity, occurrences: [], ids: [] };
      contraMap[key].occurrences.push({ investigation_id: inv.id, question: inv.question, severity: c.severity });
      contraMap[key].ids.push(inv.id);
    });

    const auditLog = inv.visibility_audit_log || [];
    auditLog.forEach(entry => {
      if (entry.reason && entry.reason.toLowerCase().includes('waiver')) {
        const key = entry.reason.toLowerCase().trim();
        if (!waiverMap[key]) waiverMap[key] = { reason: entry.reason, occurrences: [], ids: [] };
        waiverMap[key].occurrences.push({ investigation_id: inv.id, timestamp: entry.timestamp, who: entry.who });
        waiverMap[key].ids.push(inv.id);
      }
    });
  });

  // Filter to items that appear in more than one investigation
  const repeatedRisks = Object.values(riskMap).filter(r => new Set(r.ids).size > 1)
    .map(r => ({ ...r, count: new Set(r.ids).size })).sort((a, b) => b.count - a.count);

  const repeatedContras = Object.values(contraMap).filter(c => new Set(c.ids).size > 1)
    .map(c => ({ ...c, count: new Set(c.ids).size })).sort((a, b) => b.count - a.count);

  const repeatedWaivers = Object.values(waiverMap).filter(w => new Set(w.ids).size > 1)
    .map(w => ({ ...w, count: new Set(w.ids).size })).sort((a, b) => b.count - a.count);

  // Patterns: any cross-link appearing 3+ times
  const patterns = [
    ...repeatedRisks.filter(r => r.count >= 3).map(r => ({ type: 'recurring_risk', ...r })),
    ...repeatedContras.filter(c => c.count >= 3).map(c => ({ type: 'recurring_contradiction', ...c })),
    ...repeatedWaivers.filter(w => w.count >= 3).map(w => ({ type: 'recurring_waiver', ...w })),
  ];

  return { risks: repeatedRisks, contradictions: repeatedContras, waivers: repeatedWaivers, patterns };
}


// ═══ 3. Query Engine ═══
// Filters investigations by structured criteria.

export function queryInvestigations(investigations, query = {}) {
  if (!investigations) return [];

  return investigations.filter(inv => {
    // Risk level filter
    if (query.risk_level && query.risk_level !== 'all') {
      const hasRisk = (inv.leaves?.risk_impact || []).some(r => r.severity === query.risk_level);
      if (!hasRisk) return false;
    }

    // Has contradictions
    if (query.has_contradictions === true) {
      if ((inv.leaves?.contradictions || []).length === 0) return false;
    }

    // Phase filter (from synthesis phase_mapping)
    if (query.phase && query.phase !== 'all') {
      const phases = inv.leaves?.synthesis?.phase_mapping || [];
      const hasPhase = phases.some(p => p.phase === query.phase || p.phase_name === query.phase);
      if (!hasPhase) return false;
    }

    // Visibility state
    if (query.visibility_state) {
      const { field, value } = query.visibility_state;
      if (field && value && inv[field] !== value) return false;
    }

    // Has waivers in audit log
    if (query.has_waivers === true) {
      const auditLog = inv.visibility_audit_log || [];
      const hasWaiver = auditLog.some(e => (e.reason || '').toLowerCase().includes('waiver'));
      if (!hasWaiver) return false;
    }

    // Target type
    if (query.target_type && query.target_type !== 'all') {
      if (inv.target_type !== query.target_type) return false;
    }

    // Text search
    if (query.text) {
      const q = query.text.toLowerCase();
      const match = (inv.question || '').toLowerCase().includes(q)
        || (inv.leaves?.synthesis?.summary || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });
}


// ═══ 4. Summary Statistics ═══
// Computes aggregate stats across all investigations for the dashboard.

export function computeMemoryStats(investigations) {
  if (!investigations || investigations.length === 0) {
    return { total: 0, total_risks: 0, total_contradictions: 0, total_actions: 0, total_visibility_changes: 0, avg_confidence: 0, by_type: {}, by_severity: {} };
  }

  let total_risks = 0, total_contradictions = 0, total_actions = 0, total_visibility_changes = 0, confidence_sum = 0;
  const by_type = {};
  const by_severity = { critical: 0, high: 0, medium: 0, low: 0 };

  investigations.forEach(inv => {
    const risks = inv.leaves?.risk_impact || [];
    const contras = inv.leaves?.contradictions || [];
    const actions = inv.leaves?.proposed_actions || [];
    const vis = inv.visibility_audit_log || [];

    total_risks += risks.length;
    total_contradictions += contras.length;
    total_actions += actions.length;
    total_visibility_changes += vis.length;
    confidence_sum += inv.metrics?.confidence_score || 0;

    by_type[inv.target_type] = (by_type[inv.target_type] || 0) + 1;
    risks.forEach(r => { by_severity[r.severity] = (by_severity[r.severity] || 0) + 1; });
  });

  return {
    total: investigations.length,
    total_risks,
    total_contradictions,
    total_actions,
    total_visibility_changes,
    avg_confidence: Math.round(confidence_sum / investigations.length),
    by_type,
    by_severity,
  };
}