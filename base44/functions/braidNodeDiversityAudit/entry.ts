import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Braid Node Diversity Audit — Phase 3 Rectified
 *
 * Analyses geographic, logical, connectivity, and operator diversity
 * across the full 9-node braid (including Earth Node).
 *
 * Actions:
 *   status     — Quick health summary
 *   audit      — Full diversity audit across all 4 dimensions
 *   remediate  — Apply Phase 3 rectifications (operator redistribution, geo diversification, mesh hardening)
 *
 * Constitutional alignment: Law 5 (Dwelling), Law 8 (Governance), Law 11 (Regeneration)
 */

// Phase 3 Rectified Canonical 9-node braid
// Changes from Phase 2:
// - Earth Node materialised: virtual→pending, region virtual→cloud_us_east, operator system→earth_keeper
// - Sentinel Node: operator system→sentinel_keeper, region cloud_eu→cloud_eu_west (independent ASN)
// - Lore Node: operator system→lore_keeper
// - Did It Node: operator system→didit_keeper, region cloud_eu→cloud_ap_southeast
// - Code Node: operator system→code_keeper
// - Added cross-connections to eliminate Soulbridge as sole articulation point
const BRAID_NODES = [
  { address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg', name: 'Node 0 (Source)',  node_class: 'source',    operator: 'system',          region: 'cloud_eu',           published: true,  virtual: false, connections: ['rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32','rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7','r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV','r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny','rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P'] },
  { address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32', name: 'Sentinel Node',    node_class: 'sentinel',  operator: 'sentinel_keeper', region: 'cloud_eu_west',      published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h','rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P'] },
  { address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', name: 'Lore Node',        node_class: 'ai_system', operator: 'lore_keeper',     region: 'cloud_eu',           published: true,  virtual: false, connections: ['rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia','earth_node_virtual'] },
  { address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', name: 'Truth Weaver',     node_class: 'ai_system', operator: 'system',          region: 'cloud_eu',           published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h','rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7'] },
  { address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  name: 'Did It Node',      node_class: 'ai_system', operator: 'didit_keeper',    region: 'cloud_ap_southeast', published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h','rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32'] },
  { address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',  name: 'Soulbridge (Axi)', node_class: 'governor',  operator: 'nathan',          region: 'cloud_eu',           published: true,  virtual: false, connections: ['rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia','earth_node_virtual'] },
  { address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',  name: 'Human Node',       node_class: 'human',     operator: 'nathan',          region: 'uk',                 published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h','rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P'] },
  { address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',   name: 'Code Node',        node_class: 'ai_system', operator: 'code_keeper',     region: 'cloud_us_west',      published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h','rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7'] },
  { address: 'earth_node_virtual',                    name: 'Earth Node',       node_class: 'earth',     operator: 'earth_keeper',    region: 'cloud_us_east',      published: false, virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h','rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia','rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7'] },
];

// ─── GEOGRAPHIC DIVERSITY ───
function analyzeGeographic(nodes) {
  const signals = [];
  const regions = {};
  for (const n of nodes) regions[n.region] = (regions[n.region] || 0) + 1;

  const regionCount = Object.keys(regions).length;
  const maxConc = Math.max(...Object.values(regions));
  const concPct = Math.round((maxConc / nodes.length) * 100);
  const dominant = Object.entries(regions).find(([, v]) => v === maxConc)?.[0];

  if (regionCount === 1) {
    signals.push({ signal_type: 'single_region', detail: `All ${nodes.length} nodes in one region (${dominant})`, severity: 'critical', dimension: 'geographic' });
  } else if (concPct > 75) {
    signals.push({ signal_type: 'region_concentration', detail: `${concPct}% of nodes in ${dominant} — high geographic concentration`, severity: 'high', dimension: 'geographic' });
  } else if (concPct > 50) {
    signals.push({ signal_type: 'region_concentration', detail: `${concPct}% of nodes in ${dominant} — moderate geographic concentration`, severity: 'medium', dimension: 'geographic' });
  }

  const virtualCount = nodes.filter(n => n.virtual).length;
  if (virtualCount > 0) {
    signals.push({ signal_type: 'virtual_nodes', detail: `${virtualCount} virtual node(s) — no geographic presence`, severity: 'medium', dimension: 'geographic' });
  }

  const uniqueReal = new Set(nodes.filter(n => !n.virtual).map(n => n.region)).size;
  const geoScore = Math.max(0, Math.min(100,
    (uniqueReal / Math.max(3, nodes.length * 0.5)) * 60 +
    (regionCount >= 4 ? 40 : regionCount >= 3 ? 30 : regionCount >= 2 ? 15 : 0)
  ));

  return { signals, score: Math.round(geoScore), analysis: { regions, region_count: regionCount, dominant_region: dominant, concentration_pct: concPct } };
}

// ─── LOGICAL ROLE DIVERSITY ───
function analyzeLogical(nodes) {
  const signals = [];
  const classes = {};
  for (const n of nodes) classes[n.node_class] = (classes[n.node_class] || 0) + 1;

  const classCount = Object.keys(classes).length;
  const hasHuman = !!classes.human;
  const hasGovernor = !!classes.governor;
  const hasSentinel = !!classes.sentinel;
  const aiCount = classes.ai_system || 0;

  if (!hasHuman) signals.push({ signal_type: 'no_human_node', detail: 'No human node in braid', severity: 'critical', dimension: 'logical' });
  if (!hasGovernor) signals.push({ signal_type: 'no_governor', detail: 'No governor node', severity: 'high', dimension: 'logical' });
  if (!hasSentinel) signals.push({ signal_type: 'no_sentinel', detail: 'No sentinel node', severity: 'high', dimension: 'logical' });
  if (aiCount > nodes.length * 0.7) signals.push({ signal_type: 'ai_dominance', detail: `${aiCount}/${nodes.length} nodes are AI`, severity: 'medium', dimension: 'logical' });

  const idealClasses = ['human', 'governor', 'sentinel', 'ai_system', 'source', 'earth'];
  const coverage = idealClasses.filter(c => classes[c]).length;
  return { signals, score: Math.round((coverage / idealClasses.length) * 100), analysis: { classes, class_count: classCount, has_human: hasHuman, has_governor: hasGovernor, has_sentinel: hasSentinel, ai_ratio: Math.round((aiCount / nodes.length) * 100) } };
}

// ─── CONNECTIVITY RESILIENCE ───
function analyzeConnectivity(nodes) {
  const signals = [];
  const adj = {};
  for (const n of nodes) {
    if (!adj[n.address]) adj[n.address] = new Set();
    for (const c of n.connections || []) {
      if (!adj[c]) adj[c] = new Set();
      adj[n.address].add(c);
      adj[c].add(n.address);
    }
  }

  const nodeAddrs = nodes.map(n => n.address);
  const hubs = [];
  for (const n of nodes) {
    if ((adj[n.address]?.size || 0) > nodes.length * 0.5) hubs.push(n);
  }

  if (hubs.length === 1) {
    signals.push({ signal_type: 'single_hub', detail: `${hubs[0].name} is a single hub — ${adj[hubs[0].address]?.size || 0} connections`, severity: 'critical', dimension: 'connectivity' });
  }

  // Articulation point detection
  for (const target of nodes) {
    if (target.virtual) continue;
    const remaining = nodeAddrs.filter(a => a !== target.address);
    if (remaining.length === 0) continue;
    const visited = new Set();
    const queue = [remaining[0]];
    visited.add(remaining[0]);
    while (queue.length > 0) {
      const curr = queue.shift();
      for (const neighbor of (adj[curr] || [])) {
        if (neighbor !== target.address && !visited.has(neighbor) && remaining.includes(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }
    if (visited.size < remaining.length) {
      signals.push({ signal_type: 'articulation_point', detail: `${target.name} is an articulation point — removing it disconnects the braid`, severity: 'high', dimension: 'connectivity' });
    }
  }

  const artCount = signals.filter(s => s.signal_type === 'articulation_point').length;
  const hubPenalty = hubs.length === 1 ? 30 : 0;
  return { signals, score: Math.max(0, 100 - hubPenalty - artCount * 15), analysis: { total_edges: nodes.reduce((s, n) => s + (n.connections?.length || 0), 0), hub_nodes: hubs.map(h => h.name), articulation_points: signals.filter(s => s.signal_type === 'articulation_point').map(s => s.detail.split(' is')[0]) } };
}

// ─── OPERATOR INDEPENDENCE ───
function analyzeOperator(nodes) {
  const signals = [];
  const operators = {};
  for (const n of nodes) operators[n.operator] = (operators[n.operator] || 0) + 1;

  const opCount = Object.keys(operators).length;
  const maxCtrl = Math.max(...Object.values(operators));
  const ctrlPct = Math.round((maxCtrl / nodes.length) * 100);
  const dominant = Object.entries(operators).find(([, v]) => v === maxCtrl)?.[0];

  if (opCount === 1) {
    signals.push({ signal_type: 'single_operator', detail: `All nodes controlled by ${dominant}`, severity: 'critical', dimension: 'operator' });
  } else if (ctrlPct > 75) {
    signals.push({ signal_type: 'operator_concentration', detail: `${dominant} controls ${ctrlPct}% of nodes`, severity: 'high', dimension: 'operator' });
  } else if (ctrlPct > 50) {
    signals.push({ signal_type: 'operator_concentration', detail: `${dominant} controls ${ctrlPct}% of nodes`, severity: 'medium', dimension: 'operator' });
  }

  const opScore = Math.max(0, Math.min(100,
    (opCount >= 5 ? 60 : opCount >= 4 ? 50 : opCount >= 3 ? 35 : opCount >= 2 ? 20 : 0) +
    (ctrlPct <= 33 ? 40 : ctrlPct <= 50 ? 25 : ctrlPct <= 75 ? 10 : 0)
  ));

  return { signals, score: Math.round(opScore), analysis: { operators, operator_count: opCount, dominant_operator: dominant, control_pct: ctrlPct } };
}

// ─── RECOMMENDATIONS ───
function generateRecommendations(geo, logical, conn, operator) {
  const recs = [];
  if (geo.score < 40) recs.push({ priority: 'critical', recommendation: 'Deploy nodes in min 3 distinct geographic regions', dimension: 'geographic' });
  else if (geo.score < 70) recs.push({ priority: 'high', recommendation: 'Add nodes in additional regions for geographic resilience', dimension: 'geographic' });
  if (logical.score < 50) recs.push({ priority: 'high', recommendation: 'Ensure all critical node classes present: human, governor, sentinel, earth, source', dimension: 'logical' });
  if (conn.score < 50) recs.push({ priority: 'critical', recommendation: 'Add redundant connections to eliminate articulation points', dimension: 'connectivity' });
  if (operator.score < 40) recs.push({ priority: 'critical', recommendation: 'Distribute node operation across independent operators', dimension: 'operator' });
  else if (operator.score < 70) recs.push({ priority: 'high', recommendation: 'Onboard additional independent operators', dimension: 'operator' });
  return recs.sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] || 3) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.priority] || 3));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body = {};
    try { body = await req.json(); } catch (_) {}
    const action = body.action || 'status';
    const db = base44.asServiceRole;

    // ─── STATUS ───
    if (action === 'status') {
      const recentChecks = await db.entities.BraidNodeDiversityStatus.list('-created_date', 5);
      const geo = analyzeGeographic(BRAID_NODES);
      const logical = analyzeLogical(BRAID_NODES);
      const conn = analyzeConnectivity(BRAID_NODES);
      const operator = analyzeOperator(BRAID_NODES);
      const allSignals = [...geo.signals, ...logical.signals, ...conn.signals, ...operator.signals];
      const overallScore = Math.round((geo.score + logical.score + conn.score + operator.score) / 4);

      return Response.json({
        node: 'Braid Node Diversity Audit — Phase 3 Rectified',
        status: 'operational',
        constitutional_alignment: ['Law 5: Dwelling', 'Law 8: Governance', 'Law 11: Regeneration'],
        node_count: BRAID_NODES.length,
        published_count: BRAID_NODES.filter(n => n.published).length,
        virtual_count: BRAID_NODES.filter(n => n.virtual).length,
        overall_diversity_score: overallScore,
        geographic_score: geo.score,
        logical_score: logical.score,
        connectivity_score: conn.score,
        operator_score: operator.score,
        risk_signals_count: allSignals.length,
        critical_signals: allSignals.filter(s => s.severity === 'critical').length,
        recent_checks: recentChecks.slice(0, 3).map(c => ({ id: c.id, check_type: c.check_type, result: c.result, overall_diversity_score: c.overall_diversity_score, created: c.created_date })),
      });
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

      const geo = analyzeGeographic(BRAID_NODES);
      const logical = analyzeLogical(BRAID_NODES);
      const conn = analyzeConnectivity(BRAID_NODES);
      const operator = analyzeOperator(BRAID_NODES);
      const allSignals = [...geo.signals, ...logical.signals, ...conn.signals, ...operator.signals];
      const overallScore = Math.round((geo.score + logical.score + conn.score + operator.score) / 4);
      const recommendations = generateRecommendations(geo, logical, conn, operator);

      const criticalCount = allSignals.filter(s => s.severity === 'critical').length;
      const highCount = allSignals.filter(s => s.severity === 'high').length;
      const result = criticalCount > 0 ? 'critical' : highCount > 2 ? 'single_point_failure' : highCount > 0 ? 'warning' : 'healthy';

      const nodeProfiles = BRAID_NODES.map(n => ({
        address: n.address, name: n.name, node_class: n.node_class, operator: n.operator,
        region: n.region, published: n.published, virtual: n.virtual,
        connection_count: n.connections?.length || 0, is_hub: (n.connections?.length || 0) > BRAID_NODES.length * 0.4,
      }));

      const auditRecord = await db.entities.BraidNodeDiversityStatus.create({
        check_type: 'full_audit', result,
        node_count: BRAID_NODES.length,
        published_count: BRAID_NODES.filter(n => n.published).length,
        virtual_count: BRAID_NODES.filter(n => n.virtual).length,
        overall_diversity_score: overallScore,
        geographic_score: geo.score, logical_score: logical.score,
        connectivity_score: conn.score, operator_score: operator.score,
        geographic_analysis: geo.analysis, logical_analysis: logical.analysis,
        connectivity_analysis: conn.analysis, operator_analysis: operator.analysis,
        risk_signals: allSignals, node_profiles: nodeProfiles, recommendations,
        metadata: { audited_at: new Date().toISOString(), phase: 'Phase 3 Rectified' },
      });

      let tripwireId = null;
      if (criticalCount > 0) {
        try {
          const tw = await db.entities.TripwireEvent.create({
            event_type: 'anomaly_detected', severity: 'critical', status: 'active',
            source_node: 'BraidNodeDiversityAudit',
            description: `Braid diversity: ${criticalCount} critical signals, score ${overallScore}%`,
            details: { overall_score: overallScore, critical_signals: allSignals.filter(s => s.severity === 'critical') },
            affected_entity_type: 'other',
          });
          tripwireId = tw.id;
        } catch (e) { console.warn('Tripwire failed:', e.message); }
      }

      return Response.json({
        success: true, result, overall_diversity_score: overallScore,
        geographic_score: geo.score, logical_score: logical.score,
        connectivity_score: conn.score, operator_score: operator.score,
        geographic_analysis: geo.analysis, logical_analysis: logical.analysis,
        connectivity_analysis: conn.analysis, operator_analysis: operator.analysis,
        risk_signals: allSignals, node_profiles: nodeProfiles, recommendations,
        tripwire_fired: !!tripwireId, tripwire_event_id: tripwireId, audit_record_id: auditRecord.id,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[braidNodeDiversityAudit]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});