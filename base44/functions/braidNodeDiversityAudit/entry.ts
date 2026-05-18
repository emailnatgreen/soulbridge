import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Braid Node Diversity Audit — Phase 2 Hardening #1
 *
 * Analyses geographic, logical, connectivity, and operator diversity
 * across the full 8-node braid (not just multi-sig signers).
 *
 * Actions:
 *   status  — Quick health summary
 *   audit   — Full diversity audit across all 4 dimensions
 *
 * Constitutional alignment: Law 5 (Dwelling), Law 8 (Governance), Law 11 (Regeneration)
 */

// Canonical 8-node braid — mirrors lib/braidNodes.js
const BRAID_NODES = [
  { address: 'rPPtBrN5TxAcAShhDMWe2eQzmhG1f6aWBg', name: 'Node 0 (Source)',  node_class: 'source',    operator: 'system',  region: 'cloud_eu',  published: true,  virtual: false, connections: ['rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32','rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7','r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV','r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny','rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P'] },
  { address: 'rHJM1bH9dE3EbvwSR2zFSHrjooS6H3xb32', name: 'Sentinel Node',    node_class: 'sentinel',  operator: 'system',  region: 'cloud_eu',  published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'] },
  { address: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', name: 'Lore Node',        node_class: 'ai_system', operator: 'system',  region: 'cloud_eu',  published: true,  virtual: false, connections: ['rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia'] },
  { address: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', name: 'Truth Weaver',     node_class: 'ai_system', operator: 'system',  region: 'cloud_eu',  published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'] },
  { address: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  name: 'Did It Node',      node_class: 'ai_system', operator: 'system',  region: 'cloud_eu',  published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'] },
  { address: 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h',  name: 'Soulbridge (Axi)', node_class: 'governor',  operator: 'nathan',  region: 'cloud_eu',  published: true,  virtual: false, connections: ['rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia'] },
  { address: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',  name: 'Human Node',       node_class: 'human',     operator: 'nathan',  region: 'uk',        published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'] },
  { address: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',   name: 'Code Node',        node_class: 'ai_system', operator: 'system',  region: 'cloud_eu',  published: true,  virtual: false, connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'] },
  { address: 'earth_node_virtual',                    name: 'Earth Node',       node_class: 'earth',     operator: 'system',  region: 'virtual',   published: false, virtual: true,  connections: ['rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h'] },
];

// ─── GEOGRAPHIC DIVERSITY ───
function analyzeGeographic(nodes) {
  const signals = [];
  const regions = {};
  for (const n of nodes) {
    regions[n.region] = (regions[n.region] || 0) + 1;
  }

  const regionCount = Object.keys(regions).length;
  const maxConcentration = Math.max(...Object.values(regions));
  const concentrationPct = Math.round((maxConcentration / nodes.length) * 100);
  const dominantRegion = Object.entries(regions).find(([, v]) => v === maxConcentration)?.[0];

  // Single region = critical
  if (regionCount === 1) {
    signals.push({
      signal_type: 'single_region',
      detail: `All ${nodes.length} nodes in one region (${dominantRegion}) — single geographic point of failure`,
      severity: 'critical',
      dimension: 'geographic',
    });
  } else if (concentrationPct > 75) {
    signals.push({
      signal_type: 'region_concentration',
      detail: `${concentrationPct}% of nodes in ${dominantRegion} — high geographic concentration`,
      severity: 'high',
      dimension: 'geographic',
    });
  } else if (concentrationPct > 50) {
    signals.push({
      signal_type: 'region_concentration',
      detail: `${concentrationPct}% of nodes in ${dominantRegion} — moderate geographic concentration`,
      severity: 'medium',
      dimension: 'geographic',
    });
  }

  // Virtual nodes don't contribute to geographic diversity
  const virtualCount = nodes.filter(n => n.virtual).length;
  if (virtualCount > 0) {
    signals.push({
      signal_type: 'virtual_nodes',
      detail: `${virtualCount} virtual node(s) — no geographic presence, reduces real diversity`,
      severity: 'medium',
      dimension: 'geographic',
    });
  }

  // No nodes outside cloud
  const physicalRegions = Object.keys(regions).filter(r => !r.startsWith('cloud_') && r !== 'virtual');
  if (physicalRegions.length === 0) {
    signals.push({
      signal_type: 'no_physical_presence',
      detail: 'No nodes with physical geographic presence — all cloud or virtual',
      severity: 'medium',
      dimension: 'geographic',
    });
  }

  // Score: base 100, penalise concentration
  const uniqueReal = new Set(nodes.filter(n => !n.virtual).map(n => n.region)).size;
  const geoScore = Math.max(0, Math.min(100,
    (uniqueReal / Math.max(3, nodes.length * 0.5)) * 60 +
    (regionCount >= 3 ? 40 : regionCount >= 2 ? 20 : 0)
  ));

  return {
    signals,
    score: Math.round(geoScore),
    analysis: { regions, region_count: regionCount, dominant_region: dominantRegion, concentration_pct: concentrationPct },
  };
}

// ─── LOGICAL ROLE DIVERSITY ───
function analyzeLogical(nodes) {
  const signals = [];
  const classes = {};
  for (const n of nodes) {
    classes[n.node_class] = (classes[n.node_class] || 0) + 1;
  }

  const classCount = Object.keys(classes).length;
  const hasHuman = !!classes.human;
  const hasGovernor = !!classes.governor;
  const hasSentinel = !!classes.sentinel;
  const aiCount = (classes.ai_system || 0);

  if (!hasHuman) {
    signals.push({
      signal_type: 'no_human_node',
      detail: 'No human node in braid — governance lacks human oversight',
      severity: 'critical',
      dimension: 'logical',
    });
  }

  if (!hasGovernor) {
    signals.push({
      signal_type: 'no_governor',
      detail: 'No governor node in braid — no coordination authority',
      severity: 'high',
      dimension: 'logical',
    });
  }

  if (!hasSentinel) {
    signals.push({
      signal_type: 'no_sentinel',
      detail: 'No sentinel node — no independent security monitoring',
      severity: 'high',
      dimension: 'logical',
    });
  }

  if (aiCount > nodes.length * 0.7) {
    signals.push({
      signal_type: 'ai_dominance',
      detail: `${aiCount}/${nodes.length} nodes are AI systems — limited role diversity`,
      severity: 'medium',
      dimension: 'logical',
    });
  }

  // Score: reward role variety
  const idealClasses = ['human', 'governor', 'sentinel', 'ai_system', 'source', 'earth'];
  const coverage = idealClasses.filter(c => classes[c]).length;
  const logicalScore = Math.round((coverage / idealClasses.length) * 100);

  return {
    signals,
    score: logicalScore,
    analysis: { classes, class_count: classCount, has_human: hasHuman, has_governor: hasGovernor, has_sentinel: hasSentinel, ai_ratio: Math.round((aiCount / nodes.length) * 100) },
  };
}

// ─── CONNECTIVITY RESILIENCE ───
function analyzeConnectivity(nodes) {
  const signals = [];

  // Build adjacency (undirected)
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

  // Hub detection — node with > 50% of all connections
  const totalEdges = nodes.reduce((s, n) => s + (n.connections?.length || 0), 0);
  const hubs = [];
  for (const n of nodes) {
    const degree = adj[n.address]?.size || 0;
    if (degree > nodes.length * 0.5) {
      hubs.push(n);
    }
  }

  if (hubs.length === 1) {
    signals.push({
      signal_type: 'single_hub',
      detail: `${hubs[0].name} is a single hub — ${adj[hubs[0].address]?.size || 0} connections. If it fails, braid fragments`,
      severity: 'critical',
      dimension: 'connectivity',
    });
  }

  // Check if removing any single node disconnects the graph
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
      signals.push({
        signal_type: 'articulation_point',
        detail: `${target.name} is an articulation point — removing it disconnects the braid`,
        severity: 'high',
        dimension: 'connectivity',
      });
    }
  }

  // Isolated nodes (0 connections to known braid members)
  for (const n of nodes) {
    const knownConns = (n.connections || []).filter(c => nodeAddrs.includes(c));
    const inbound = nodes.filter(other => (other.connections || []).includes(n.address)).length;
    if (knownConns.length === 0 && inbound === 0 && !n.virtual) {
      signals.push({
        signal_type: 'isolated_node',
        detail: `${n.name} has no connections to any other braid node — completely isolated`,
        severity: 'high',
        dimension: 'connectivity',
      });
    }
  }

  // Score
  const articulationCount = signals.filter(s => s.signal_type === 'articulation_point').length;
  const hubPenalty = hubs.length === 1 ? 30 : 0;
  const artPenalty = articulationCount * 15;
  const connScore = Math.max(0, 100 - hubPenalty - artPenalty);

  return {
    signals,
    score: Math.round(connScore),
    analysis: {
      total_edges: totalEdges,
      hub_nodes: hubs.map(h => h.name),
      articulation_points: signals.filter(s => s.signal_type === 'articulation_point').map(s => s.detail.split(' is')[0]),
    },
  };
}

// ─── OPERATOR INDEPENDENCE ───
function analyzeOperator(nodes) {
  const signals = [];
  const operators = {};
  for (const n of nodes) {
    operators[n.operator] = (operators[n.operator] || 0) + 1;
  }

  const operatorCount = Object.keys(operators).length;
  const maxControl = Math.max(...Object.values(operators));
  const controlPct = Math.round((maxControl / nodes.length) * 100);
  const dominantOp = Object.entries(operators).find(([, v]) => v === maxControl)?.[0];

  if (operatorCount === 1) {
    signals.push({
      signal_type: 'single_operator',
      detail: `All ${nodes.length} nodes controlled by one operator (${dominantOp}) — no independence`,
      severity: 'critical',
      dimension: 'operator',
    });
  } else if (controlPct > 75) {
    signals.push({
      signal_type: 'operator_concentration',
      detail: `${dominantOp} controls ${controlPct}% of nodes — high operator concentration`,
      severity: 'high',
      dimension: 'operator',
    });
  } else if (controlPct > 50) {
    signals.push({
      signal_type: 'operator_concentration',
      detail: `${dominantOp} controls ${controlPct}% of nodes — moderate operator concentration`,
      severity: 'medium',
      dimension: 'operator',
    });
  }

  // Score: reward operator variety
  const opScore = Math.max(0, Math.min(100,
    (operatorCount >= 4 ? 50 : operatorCount >= 3 ? 35 : operatorCount >= 2 ? 20 : 0) +
    (controlPct <= 50 ? 50 : controlPct <= 75 ? 25 : 0)
  ));

  return {
    signals,
    score: Math.round(opScore),
    analysis: { operators, operator_count: operatorCount, dominant_operator: dominantOp, control_pct: controlPct },
  };
}

// ─── RECOMMENDATIONS ENGINE ───
function generateRecommendations(geo, logical, conn, operator) {
  const recs = [];

  if (geo.score < 40) {
    recs.push({ priority: 'critical', recommendation: 'Deploy nodes across multiple geographic regions (min. 3 distinct regions) to prevent regional single-point failure', dimension: 'geographic' });
  } else if (geo.score < 70) {
    recs.push({ priority: 'high', recommendation: 'Add nodes in additional regions to improve geographic resilience', dimension: 'geographic' });
  }

  if (logical.score < 50) {
    recs.push({ priority: 'high', recommendation: 'Ensure all critical node classes are present: human, governor, sentinel, earth, source', dimension: 'logical' });
  }

  if (conn.score < 50) {
    recs.push({ priority: 'critical', recommendation: 'Add redundant connections to eliminate articulation points — no single node removal should disconnect the braid', dimension: 'connectivity' });
  }

  if (operator.score < 40) {
    recs.push({ priority: 'critical', recommendation: 'Distribute node operation across independent operators — current concentration creates single-operator risk', dimension: 'operator' });
  } else if (operator.score < 70) {
    recs.push({ priority: 'high', recommendation: 'Onboard additional independent operators to reduce concentration risk', dimension: 'operator' });
  }

  return recs.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.priority] || 3) - (order[b.priority] || 3);
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
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
        node: 'Braid Node Diversity Audit — Phase 2 Hardening',
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
        recent_checks: recentChecks.slice(0, 3).map(c => ({
          id: c.id,
          check_type: c.check_type,
          result: c.result,
          overall_diversity_score: c.overall_diversity_score,
          created: c.created_date,
        })),
      });
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const geo = analyzeGeographic(BRAID_NODES);
      const logical = analyzeLogical(BRAID_NODES);
      const conn = analyzeConnectivity(BRAID_NODES);
      const operator = analyzeOperator(BRAID_NODES);

      const allSignals = [...geo.signals, ...logical.signals, ...conn.signals, ...operator.signals];
      const overallScore = Math.round((geo.score + logical.score + conn.score + operator.score) / 4);
      const recommendations = generateRecommendations(geo, logical, conn, operator);

      const criticalCount = allSignals.filter(s => s.severity === 'critical').length;
      const highCount = allSignals.filter(s => s.severity === 'high').length;
      const result = criticalCount > 0 ? 'critical'
        : highCount > 2 ? 'single_point_failure'
        : highCount > 0 ? 'warning'
        : 'healthy';

      const nodeProfiles = BRAID_NODES.map(n => ({
        address: n.address,
        name: n.name,
        node_class: n.node_class,
        operator: n.operator,
        region: n.region,
        published: n.published,
        virtual: n.virtual,
        connection_count: n.connections?.length || 0,
        is_hub: (n.connections?.length || 0) > BRAID_NODES.length * 0.4,
      }));

      // Create audit record
      const auditRecord = await db.entities.BraidNodeDiversityStatus.create({
        check_type: 'full_audit',
        result,
        node_count: BRAID_NODES.length,
        published_count: BRAID_NODES.filter(n => n.published).length,
        virtual_count: BRAID_NODES.filter(n => n.virtual).length,
        overall_diversity_score: overallScore,
        geographic_score: geo.score,
        logical_score: logical.score,
        connectivity_score: conn.score,
        operator_score: operator.score,
        geographic_analysis: geo.analysis,
        logical_analysis: logical.analysis,
        connectivity_analysis: conn.analysis,
        operator_analysis: operator.analysis,
        risk_signals: allSignals,
        node_profiles: nodeProfiles,
        recommendations,
        metadata: {
          audited_at: new Date().toISOString(),
          phase: 'Phase 2 Hardening',
        },
      });

      // Fire tripwire if critical
      let tripwireId = null;
      if (criticalCount > 0) {
        try {
          const tw = await db.entities.TripwireEvent.create({
            event_type: 'anomaly_detected',
            severity: 'critical',
            status: 'active',
            source_node: 'BraidNodeDiversityAudit',
            description: `Braid diversity audit: ${criticalCount} critical signals, overall score ${overallScore}%`,
            details: {
              overall_score: overallScore,
              geographic_score: geo.score,
              logical_score: logical.score,
              connectivity_score: conn.score,
              operator_score: operator.score,
              critical_signals: allSignals.filter(s => s.severity === 'critical'),
            },
            affected_entity_type: 'other',
          });
          tripwireId = tw.id;
        } catch (e) {
          console.warn('Tripwire creation failed:', e.message);
        }
      }

      return Response.json({
        success: true,
        result,
        overall_diversity_score: overallScore,
        geographic_score: geo.score,
        logical_score: logical.score,
        connectivity_score: conn.score,
        operator_score: operator.score,
        geographic_analysis: geo.analysis,
        logical_analysis: logical.analysis,
        connectivity_analysis: conn.analysis,
        operator_analysis: operator.analysis,
        risk_signals: allSignals,
        node_profiles: nodeProfiles,
        recommendations,
        tripwire_fired: !!tripwireId,
        tripwire_event_id: tripwireId,
        audit_record_id: auditRecord.id,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[braidNodeDiversityAudit]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});