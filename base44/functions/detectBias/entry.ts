import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Leaf 1 — Bias Detection Engine
 * 
 * Analyses failure patterns from Leaf 6 (100 Prisoner Simulator),
 * Tripwire events, Compressed Attention scores, and Lore/Memory
 * to detect systematic biases and generate actionable bias reports.
 * 
 * Actions: scan | review | status
 */

const BIAS_NODE_ID = 'heptagon-leaf1-bias-detection';

function generateBiasId() {
  return `BIAS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// Analyse Tripwire events for systematic patterns (not random errors)
function analyseTripwirePatterns(events) {
  const biases = [];
  if (events.length < 3) return biases;

  // Node clustering — same node triggering disproportionate events
  const nodeCounts = {};
  for (const e of events) {
    const node = e.source_node || 'unknown';
    nodeCounts[node] = (nodeCounts[node] || 0) + 1;
  }
  const avgPerNode = events.length / Math.max(Object.keys(nodeCounts).length, 1);
  for (const [node, count] of Object.entries(nodeCounts)) {
    if (count > avgPerNode * 2.5 && count >= 3) {
      biases.push({
        bias_type: 'node_clustering',
        severity: count > avgPerNode * 4 ? 'high' : 'medium',
        description: `Node "${node}" triggered ${count} events (avg ${avgPerNode.toFixed(1)}) — systematic clustering detected.`,
        correction_suggestion: `Investigate Node "${node}" for misconfiguration or persistent fault. Consider isolating for diagnostic.`,
        affected_nodes: [parseInt(node) || 0],
        linked_scars: events.filter(e => e.source_node === node).map(e => e.id).slice(0, 10),
        analysis_data: { node, count, average: avgPerNode, ratio: count / avgPerNode },
      });
    }
  }

  // Severity skew — disproportionate severity distribution
  const sevCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const e of events) { sevCounts[e.severity] = (sevCounts[e.severity] || 0) + 1; }
  const total = events.length;
  if (sevCounts.critical / total > 0.4 && sevCounts.critical >= 3) {
    biases.push({
      bias_type: 'timeout_skew',
      severity: 'high',
      description: `${sevCounts.critical}/${total} events are critical (${(sevCounts.critical/total*100).toFixed(0)}%) — possible severity inflation or persistent critical fault.`,
      correction_suggestion: 'Review critical event thresholds. Check if severity scoring is properly calibrated.',
      affected_nodes: [],
      linked_scars: events.filter(e => e.severity === 'critical').map(e => e.id).slice(0, 10),
      analysis_data: { sevCounts, total, criticalRatio: sevCounts.critical / total },
    });
  }

  return biases;
}

// Analyse Compressed Attention for semantic drift
function analyseAttentionDrift(memories) {
  const biases = [];
  if (memories.length < 2) return biases;

  // Extract threat levels from memory content
  const threatLevels = [];
  for (const m of memories) {
    const match = m.content?.match(/Threat Level:\s*(\w+)/);
    if (match) threatLevels.push({ level: match[1], date: m.created_date, importance: m.importance });
  }

  // Detect sustained elevation
  const elevatedCount = threatLevels.filter(t => t.level === 'ELEVATED' || t.level === 'CRITICAL').length;
  if (elevatedCount > threatLevels.length * 0.6 && elevatedCount >= 3) {
    biases.push({
      bias_type: 'semantic_shift',
      severity: 'medium',
      description: `Compressed Attention shows sustained elevation: ${elevatedCount}/${threatLevels.length} analyses at ELEVATED or CRITICAL — possible attention drift.`,
      correction_suggestion: 'Recalibrate Node 8 threat scoring thresholds. Check for stale baseline data.',
      affected_nodes: [7],
      linked_scars: memories.map(m => m.id).slice(0, 5),
      analysis_data: { threatLevels: threatLevels.slice(0, 10), elevatedRatio: elevatedCount / threatLevels.length },
    });
  }

  // Importance score drift
  const importances = memories.map(m => m.importance).filter(Boolean);
  if (importances.length >= 3) {
    const avg = importances.reduce((a, b) => a + b, 0) / importances.length;
    if (avg > 7) {
      biases.push({
        bias_type: 'attention_drift',
        severity: 'low',
        description: `Average memory importance is ${avg.toFixed(1)}/10 — potential over-weighting of attention signals.`,
        correction_suggestion: 'Review importance scoring in Compressed Attention. Ensure proportional weighting.',
        affected_nodes: [7],
        linked_scars: [],
        analysis_data: { avgImportance: avg, samples: importances.length },
      });
    }
  }

  return biases;
}

// Analyse Lore/Memory for honour drift and skill stagnation
function analyseLorePatterns(agents, skills, honourMemories) {
  const biases = [];

  // Honour drift — agents stuck at extremes
  if (agents.length >= 3) {
    const highHonour = agents.filter(a => a.honor_score >= 95);
    const lowHonour = agents.filter(a => a.honor_score <= 20);
    if (highHonour.length > agents.length * 0.8) {
      biases.push({
        bias_type: 'honour_drift',
        severity: 'medium',
        description: `${highHonour.length}/${agents.length} agents have honour ≥95 — possible honour inflation (no meaningful differentiation).`,
        correction_suggestion: 'Review honour scoring criteria. Ensure meaningful variance in honour outcomes.',
        affected_nodes: [],
        linked_scars: [],
        analysis_data: { highCount: highHonour.length, totalAgents: agents.length },
      });
    }
    if (lowHonour.length > agents.length * 0.3 && lowHonour.length >= 2) {
      biases.push({
        bias_type: 'honour_drift',
        severity: 'high',
        description: `${lowHonour.length}/${agents.length} agents have honour ≤20 — possible honour deflation or punitive bias.`,
        correction_suggestion: 'Review warning and honour reduction mechanisms. Check for cascading penalties.',
        affected_nodes: [],
        linked_scars: [],
        analysis_data: { lowCount: lowHonour.length, totalAgents: agents.length },
      });
    }
  }

  // Skill stagnation — skills not growing
  if (skills.length >= 5) {
    const stagnant = skills.filter(s => s.skill_growth_trajectory === 'declining' || s.skill_growth_trajectory === 'stable');
    if (stagnant.length > skills.length * 0.7) {
      biases.push({
        bias_type: 'skill_stagnation',
        severity: 'low',
        description: `${stagnant.length}/${skills.length} skills are stable/declining — possible stagnation in agent development.`,
        correction_suggestion: 'Review training module effectiveness. Consider adjusting skill XP curves.',
        affected_nodes: [],
        linked_scars: [],
        analysis_data: { stagnantCount: stagnant.length, totalSkills: skills.length },
      });
    }
  }

  return biases;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'scan';

    // ─── STATUS ───
    if (action === 'status') {
      const recentReports = await base44.asServiceRole.entities.BiasReport.list('-created_date', 10);
      const pending = recentReports.filter(r => r.status === 'pending').length;
      const reviewed = recentReports.filter(r => r.status === 'reviewed' || r.status === 'corrected').length;
      return Response.json({
        node: 'Leaf 1 — Bias Detection',
        status: 'operational',
        total_reports: recentReports.length,
        pending,
        reviewed,
        last_scan: recentReports[0]?.created_date || null,
      });
    }

    // Admin gate
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ─── REVIEW (Axi approves/dismisses a bias report) ───
    if (action === 'review') {
      const { report_id, decision, notes } = body;
      if (!report_id || !decision || !notes) {
        return Response.json({ error: 'report_id, decision, and notes are required' }, { status: 400 });
      }
      if (!['approved', 'dismissed', 'needs_info'].includes(decision)) {
        return Response.json({ error: 'decision must be approved, dismissed, or needs_info' }, { status: 400 });
      }

      const newStatus = decision === 'approved' ? 'corrected'
        : decision === 'dismissed' ? 'dismissed'
        : 'reviewed';

      await base44.asServiceRole.entities.BiasReport.update(report_id, {
        axi_review: decision,
        axi_notes: notes,
        status: newStatus,
        reviewed_by: user.email,
        reviewed_at: new Date().toISOString(),
        ...(decision === 'approved' ? { corrected_at: new Date().toISOString() } : {}),
      });

      // Audit trail
      await base44.asServiceRole.entities.Memory.create({
        agent_id: BIAS_NODE_ID,
        type: 'observation',
        content: `Bias Report ${report_id} — Decision: ${decision}. Notes: ${notes}`,
        keywords: ['bias_detection', 'review', decision, 'heptagon', 'leaf_1'],
        context: `Bias review by ${user.email} at ${new Date().toISOString()}`,
        importance: decision === 'approved' ? 8 : 5,
      });

      return Response.json({ success: true, report_id, decision, status: newStatus });
    }

    // ─── SCAN — Full bias detection ───
    if (action === 'scan') {
      const startTime = Date.now();
      const allBiases = [];

      // 1. Gather data from all sources
      const [tripwireEvents, attentionMemories, agents, skills] = await Promise.all([
        base44.asServiceRole.entities.TripwireEvent.list('-created_date', 100),
        base44.asServiceRole.entities.Memory.filter(
          { agent_id: 'compressed-attention-node8' },
          '-created_date', 20
        ),
        base44.asServiceRole.entities.Agent.list('-created_date', 200),
        base44.asServiceRole.entities.AgentSkill.list('-created_date', 500).catch(() => []),
      ]);

      // 2. Run analysis engines
      const tripwireBiases = analyseTripwirePatterns(tripwireEvents);
      const attentionBiases = analyseAttentionDrift(attentionMemories);
      const loreBiases = analyseLorePatterns(agents, skills, []);

      // Tag sources
      for (const b of tripwireBiases) { b.source = 'tripwire'; allBiases.push(b); }
      for (const b of attentionBiases) { b.source = 'compressed_attention'; allBiases.push(b); }
      for (const b of loreBiases) { b.source = 'lore'; allBiases.push(b); }

      // 3. Create BiasReport records
      const createdReports = [];
      for (const bias of allBiases) {
        const report = await base44.asServiceRole.entities.BiasReport.create({
          bias_id: generateBiasId(),
          source: bias.source,
          bias_type: bias.bias_type,
          severity: bias.severity,
          affected_nodes: bias.affected_nodes || [],
          description: bias.description,
          correction_suggestion: bias.correction_suggestion,
          status: 'pending',
          linked_scars: bias.linked_scars || [],
          analysis_data: bias.analysis_data || {},
        });
        createdReports.push(report);
      }

      const elapsedMs = Date.now() - startTime;

      // 4. Audit trail in Memory
      const summaryContent = [
        `🔬 Leaf 1 — Bias Detection Scan`,
        `Biases Found: ${allBiases.length}`,
        `Sources: Tripwire (${tripwireBiases.length}), Attention (${attentionBiases.length}), Lore (${loreBiases.length})`,
        `Data Analysed: ${tripwireEvents.length} tripwire events, ${attentionMemories.length} attention memories, ${agents.length} agents, ${skills.length} skills`,
        `Processing Time: ${elapsedMs}ms`,
        ``,
        ...allBiases.map((b, i) => `  ${i + 1}. [${b.severity}] ${b.bias_type} — ${b.description.substring(0, 100)}`),
      ].join('\n');

      const memoryRecord = await base44.asServiceRole.entities.Memory.create({
        agent_id: BIAS_NODE_ID,
        type: 'observation',
        content: summaryContent,
        keywords: ['bias_detection', 'heptagon', 'leaf_1', 'scan', 'security', 'lab'],
        context: `Bias Detection Scan — ${new Date().toISOString()}`,
        importance: allBiases.some(b => b.severity === 'critical') ? 9
          : allBiases.some(b => b.severity === 'high') ? 7
          : allBiases.length > 0 ? 5 : 3,
      });

      // Update reports with memory_id
      for (const report of createdReports) {
        await base44.asServiceRole.entities.BiasReport.update(report.id, {
          memory_id: memoryRecord.id,
        });
      }

      return Response.json({
        success: true,
        biases_found: allBiases.length,
        reports_created: createdReports.length,
        breakdown: {
          tripwire: tripwireBiases.length,
          compressed_attention: attentionBiases.length,
          lore: loreBiases.length,
        },
        data_analysed: {
          tripwire_events: tripwireEvents.length,
          attention_memories: attentionMemories.length,
          agents: agents.length,
          skills: skills.length,
        },
        processing_ms: elapsedMs,
        reports: createdReports.map(r => ({
          id: r.id,
          bias_id: r.bias_id,
          bias_type: r.bias_type,
          severity: r.severity,
          source: r.source,
          description: r.description,
        })),
        memory_id: memoryRecord.id,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[detectBias]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});