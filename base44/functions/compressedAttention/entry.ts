import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Compressed Attention — Node 8: Semantic Analysis & Attention
 *
 * Actions: analyze | status
 *
 * Options (passed in body):
 *   include_resolved: boolean (default false) — if true, score ALL events including resolved/false_positive
 *                     When false, resolved events are excluded from threat scoring
 *                     but still recorded in the full audit Memory record.
 *
 * Implements:
 * - Compressed Attention: distil high-dimensional signals into compact threat vectors
 * - Loop Computing: iterative re-evaluation (up to 4 adaptive passes)
 * - Semantic Threat Scoring: meaning-based scoring (rule-based + LLM for edge cases)
 * - Behavioral Anomaly Detection: deviation from baselines
 * - Context-Aware Enrichment: add metadata before Sentinel review
 * - Privacy-Preserving Inference: hashed inputs, no raw PII
 * - ZK Wellbeing Proof Integration: wellbeing checks routed through zkWellbeingProof layer
 *
 * All Memory records tagged with 'compressed_attention'.
 *
 * Phase 1 Fix: Privacy vs Oversight — Node 8 no longer inspects raw wellbeing data.
 * Wellbeing evaluation is delegated to zkWellbeingProof which returns only
 * threshold verdicts and anonymised flags. Attestation IDs are recorded for audit.
 */

const NODE_8_ID = 'compressed-attention-node8';

// ─── Privacy helpers ───
async function hashValue(val) {
  const enc = new TextEncoder().encode(String(val));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Rule-based semantic scorer ───
function scoreSignal(signal) {
  let score = 0;
  const tags = [];

  // Severity weighting
  const sevWeight = { critical: 40, high: 25, medium: 12, low: 4 };
  score += sevWeight[signal.severity] || 5;

  // Type weighting
  const typeWeight = {
    entropy_tampering: 35, access_violation: 30, sentinel_flag: 28,
    node_offline: 22, multisig_alert: 20, threshold_breach: 15,
    rate_limit_exceeded: 12, pattern_deviation: 10, anomaly_detected: 8,
  };
  score += typeWeight[signal.event_type] || 5;

  // Recency boost (last hour)
  const ageMs = Date.now() - new Date(signal.created_date).getTime();
  if (ageMs < 3600_000) { score += 15; tags.push('recent'); }
  else if (ageMs < 86400_000) { score += 5; tags.push('today'); }

  // Active status boost
  if (signal.status === 'active') { score += 10; tags.push('active'); }

  // Cluster detection: if source_node appears repeatedly
  if (signal._cluster_count > 1) {
    score += signal._cluster_count * 5;
    tags.push(`cluster:${signal._cluster_count}`);
  }

  return { score: Math.min(score, 100), tags };
}

// ─── Behavioral anomaly: entropy round patterns ───
function detectEntropyAnomalies(rounds) {
  const anomalies = [];
  const completedRounds = rounds.filter(r => r.phase === 'finalised');

  // Consecutive failed verifications
  let failStreak = 0;
  for (const r of rounds) {
    if (r.phase === 'failed') { failStreak++; } else { failStreak = 0; }
    if (failStreak >= 2) {
      anomalies.push({
        type: 'entropy_fail_streak',
        description: `${failStreak} consecutive failed entropy rounds detected`,
        severity: 'high',
        round_numbers: rounds.filter(r => r.phase === 'failed').map(r => r.round_number),
      });
    }
  }

  // Participation drop
  for (const r of completedRounds) {
    if (r.participating_nodes < r.required_nodes) {
      anomalies.push({
        type: 'participation_drop',
        description: `Round ${r.round_number}: only ${r.participating_nodes}/${r.required_nodes} nodes participated`,
        severity: 'medium',
        round_number: r.round_number,
      });
    }
  }

  // Verification mismatches in reveals
  for (const r of completedRounds) {
    const unverified = (r.node_reveals || []).filter(n => !n.verified);
    if (unverified.length > 0) {
      anomalies.push({
        type: 'verification_mismatch',
        description: `Round ${r.round_number}: ${unverified.length} node(s) failed hash verification`,
        severity: 'critical',
        nodes: unverified.map(n => n.node_name),
      });
    }
  }

  return anomalies;
}

// ─── MWTP behavioral baselines ───
// recentTripwires: pass in recent TripwireEvents so we can deduplicate replay alerts
function detectMWTPAnomalies(packets, recentTripwires = []) {
  const anomalies = [];
  if (packets.length < 3) return anomalies;

  const kuCounts = packets.map(p => p.ku_count || 0);
  const avg = kuCounts.reduce((a, b) => a + b, 0) / kuCounts.length;
  const stdDev = Math.sqrt(kuCounts.reduce((s, v) => s + (v - avg) ** 2, 0) / kuCounts.length);

  for (const p of packets) {
    const ku = p.ku_count || 0;
    if (stdDev > 0 && Math.abs(ku - avg) > 2 * stdDev) {
      anomalies.push({
        type: 'mwtp_outlier',
        description: `MWTP packet KU count ${ku} deviates >2σ from mean ${avg.toFixed(1)}`,
        severity: ku > avg ? 'low' : 'medium',
        packet_id: p.id,
      });
    }
  }

  // Integrity checksum duplicates (possible replay)
  const checksums = packets.map(p => p.integrity_checksum).filter(Boolean);
  const uniqueDupes = [...new Set(checksums.filter((c, i) => checksums.indexOf(c) !== i))];

  if (uniqueDupes.length > 0) {
    // Deduplication: check if an mwtp_replay_suspect tripwire was already created
    // in the last 30 minutes — if so, skip to prevent alert storms
    const DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
    const now = Date.now();
    const recentReplayAlerts = recentTripwires.filter(t =>
      t.details?.anomaly_type === 'mwtp_replay_suspect' &&
      t.source_node?.includes('Compressed Attention') &&
      (now - new Date(t.created_date).getTime()) < DEDUP_WINDOW_MS
    );

    if (recentReplayAlerts.length === 0) {
      anomalies.push({
        type: 'mwtp_replay_suspect',
        description: `${uniqueDupes.length} duplicate integrity checksums detected — possible replay`,
        severity: 'high',
        deduplicated_checksums: uniqueDupes.length,
      });
    }
    // else: skip — already flagged recently, no new alert needed
  }

  return anomalies;
}

// ─── Loop Computing: iterative refinement ───
function loopCompute(vectors, maxLoops = 4) {
  let stable = false;
  let loop = 0;
  let prev = vectors.map(v => v.score);

  while (!stable && loop < maxLoops) {
    loop++;

    // Cross-signal correlation: boost signals that share source nodes or entity types
    for (let i = 0; i < vectors.length; i++) {
      let correlated = 0;
      for (let j = 0; j < vectors.length; j++) {
        if (i === j) continue;
        if (vectors[i].source_node === vectors[j].source_node) correlated += 3;
        if (vectors[i].affected_entity_type && vectors[i].affected_entity_type === vectors[j].affected_entity_type) correlated += 2;
        if (Math.abs(vectors[i].score - vectors[j].score) < 10) correlated += 1;
      }
      vectors[i].score = Math.min(100, vectors[i].score + Math.floor(correlated / vectors.length * 5));
    }

    // Check convergence
    const curr = vectors.map(v => v.score);
    const delta = curr.reduce((s, v, i) => s + Math.abs(v - prev[i]), 0);
    if (delta < 2) stable = true;
    prev = curr;
  }

  return { vectors, loops: loop, converged: stable };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'analyze';

    // ─── STATUS ───
    if (action === 'status') {
      const recentMemories = await base44.asServiceRole.entities.Memory.filter(
        { agent_id: NODE_8_ID },
        '-created_date', 10
      );
      return Response.json({
        node: 'Node 8 — Semantic Analysis & Attention',
        status: 'operational',
        last_analyses: recentMemories.length,
        memories: recentMemories.map(m => ({
          id: m.id,
          summary: m.content?.substring(0, 120),
          created: m.created_date,
          importance: m.importance,
        })),
      });
    }

    // Admin gate for analysis
    if (user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // ─── ANALYZE ───
    if (action === 'analyze') {
      const startTime = Date.now();
      const includeResolved = body.include_resolved === true;
      const EXCLUDED_STATUSES = ['resolved', 'false_positive'];

      // 1. Gather signals (privacy-preserving: hash actor emails)
      const [allTripwireEvents, entropyRounds, mwtpPackets] = await Promise.all([
        base44.asServiceRole.entities.TripwireEvent.list('-created_date', 30),
        base44.asServiceRole.entities.EntropyRound.list('-round_number', 10),
        base44.asServiceRole.entities.MWTPPacket.list('-created_date', 20),
      ]);

      // Separate active vs resolved for hybrid scoring
      const activeEvents = includeResolved
        ? allTripwireEvents
        : allTripwireEvents.filter(e => !EXCLUDED_STATUSES.includes(e.status));
      const resolvedCount = allTripwireEvents.length - activeEvents.length;

      // 2. Cluster active tripwire events by source node
      const clusterMap = {};
      for (const e of activeEvents) {
        const key = e.source_node || 'unknown';
        clusterMap[key] = (clusterMap[key] || 0) + 1;
      }

      // 3. Score active tripwire signals (resolved excluded from threat scoring)
      const scoredVectors = [];
      for (const e of activeEvents) {
        e._cluster_count = clusterMap[e.source_node] || 1;
        const { score, tags } = scoreSignal(e);

        scoredVectors.push({
          id: e.id,
          event_type: e.event_type,
          severity: e.severity,
          status: e.status,
          source_node: e.source_node,
          affected_entity_type: e.affected_entity_type || null,
          actor_hash: e.actor_email ? await hashValue(e.actor_email) : null,
          score,
          tags,
          created: e.created_date,
          description_hash: await hashValue(e.description || ''),
        });
      }

      // 4. ZK Wellbeing Proof — privacy-preserving wellbeing evaluation
      //    Delegated to zkWellbeingProof: returns threshold verdicts only, no raw data
      let zkWellbeingResult = null;
      let zkAttestationId = null;
      try {
        const zkRes = await base44.asServiceRole.functions.invoke('zkWellbeingProof', {
          action: 'evaluate',
        });
        zkWellbeingResult = zkRes.data || zkRes;
        zkAttestationId = zkWellbeingResult?.attestation?.id || null;

        // Inject ZK wellbeing flags as synthetic scored vectors (anonymised)
        if (zkWellbeingResult?.evaluation?.verdicts) {
          for (const v of zkWellbeingResult.evaluation.verdicts) {
            if (v.flags.length > 0) {
              const sevMap = {
                'honor_critically_low': 'critical',
                'wellbeing_critical': 'critical',
                'activity_anomaly_critical': 'critical',
                'economic_anomaly': 'high',
                'honor_warning': 'medium',
                'wellbeing_warning': 'medium',
                'activity_anomaly_warning': 'medium',
                'governance_inactive': 'low',
              };
              const worstFlag = v.flags.reduce((worst, f) => {
                const order = ['low', 'medium', 'high', 'critical'];
                const wIdx = order.indexOf(sevMap[worst] || 'low');
                const fIdx = order.indexOf(sevMap[f] || 'low');
                return fIdx > wIdx ? f : worst;
              }, v.flags[0]);
              const severity = sevMap[worstFlag] || 'medium';
              const sevScore = { critical: 70, high: 50, medium: 25, low: 10 };

              scoredVectors.push({
                id: `zk-wellbeing-${v.signal_hash}`,
                event_type: `zk_wellbeing_${v.category}`,
                severity,
                status: 'active',
                source_node: 'ZK Wellbeing Proof (Node 8)',
                affected_entity_type: 'Agent',
                actor_hash: v.signal_hash,
                score: sevScore[severity] || 20,
                tags: ['zk_wellbeing', 'privacy_preserving', ...v.flags],
                created: new Date().toISOString(),
                description_hash: await hashValue(v.flags.join(',')),
                anomaly_detail: `ZK flags: ${v.flags.join(', ')} (category: ${v.category})`,
              });
            }
          }
        }
      } catch (zkErr) {
        console.error('[compressedAttention] ZK wellbeing proof failed (non-blocking):', zkErr.message);
      }

      // 5. Behavioral anomaly detection
      // Pass ALL tripwire events (not just active) to MWTP detector for deduplication
      const entropyAnomalies = detectEntropyAnomalies(entropyRounds);
      const mwtpAnomalies = detectMWTPAnomalies(mwtpPackets, allTripwireEvents);
      const allAnomalies = [...entropyAnomalies, ...mwtpAnomalies];

      // Inject anomalies as synthetic scored vectors
      for (const a of allAnomalies) {
        const sevScore = { critical: 75, high: 55, medium: 30, low: 15 };
        scoredVectors.push({
          id: `anomaly-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          event_type: a.type,
          severity: a.severity,
          status: 'active',
          source_node: 'Node 8 (Compressed Attention)',
          affected_entity_type: a.type.startsWith('entropy') ? 'EntropyRound' : 'MWTPPacket',
          actor_hash: null,
          score: sevScore[a.severity] || 20,
          tags: ['behavioral_anomaly', a.type],
          created: new Date().toISOString(),
          description_hash: await hashValue(a.description),
          anomaly_detail: a.description,
        });
      }

      // 6. Loop Computing — iterative cross-signal refinement
      const { vectors: refinedVectors, loops, converged } = loopCompute(scoredVectors);

      // 7. Compress: top threats sorted by score
      const sorted = refinedVectors.sort((a, b) => b.score - a.score);
      const topThreats = sorted.slice(0, 10);
      const avgScore = sorted.length > 0
        ? Math.round(sorted.reduce((s, v) => s + v.score, 0) / sorted.length)
        : 0;

      // Threat level determination
      const maxScore = topThreats[0]?.score || 0;
      const threatLevel = maxScore >= 70 ? 'CRITICAL'
        : maxScore >= 45 ? 'ELEVATED'
        : maxScore >= 20 ? 'GUARDED'
        : 'NOMINAL';

      // 8. Create enriched TripwireEvents for new anomalies (only high/critical)
      // With deduplication: skip if an active alert of the same anomaly_type exists from the last 30 min
      const ALERT_DEDUP_MS = 30 * 60 * 1000;
      const now = Date.now();
      const newAlerts = [];
      for (const a of allAnomalies.filter(a => a.severity === 'high' || a.severity === 'critical')) {
        // Check for existing active alert of the same anomaly type within dedup window
        const existingAlert = allTripwireEvents.find(t =>
          t.details?.anomaly_type === a.type &&
          t.source_node?.includes('Compressed Attention') &&
          (t.status === 'active' || t.status === 'acknowledged') &&
          (now - new Date(t.created_date).getTime()) < ALERT_DEDUP_MS
        );
        if (existingAlert) continue; // skip — already flagged

        const event = await base44.asServiceRole.entities.TripwireEvent.create({
          event_type: 'pattern_deviation',
          severity: a.severity,
          status: 'active',
          source_node: 'Node 8 (Compressed Attention)',
          source_node_index: 7,
          description: `[CA] ${a.description}`,
          details: {
            anomaly_type: a.type,
            detected_by: 'compressed_attention',
            loop_passes: loops,
            converged,
            ...(a.round_number ? { round_number: a.round_number } : {}),
            ...(a.nodes ? { affected_nodes: a.nodes } : {}),
          },
          sentinel_verified: false,
          notified_signers: ['Sentinel', 'Code Node', 'Axi'],
        });
        newAlerts.push(event);
      }

      const elapsedMs = Date.now() - startTime;

      // 9. Compressed attention summary → Memory (full audit trail — ALL events)
      const zkStatus = zkWellbeingResult?.evaluation?.overall_status || 'NOT_RUN';
      const zkFlags = zkWellbeingResult?.evaluation?.flags_summary?.total || 0;
      const summaryContent = [
        `🧠 Compressed Attention Analysis — Node 8`,
        `Threat Level: ${threatLevel} | Avg Score: ${avgScore}/100 | Max: ${maxScore}/100`,
        `ZK Wellbeing: ${zkStatus} | Flags: ${zkFlags} | Attestation: ${zkAttestationId || 'none'}`,
        `Mode: ${includeResolved ? 'Full (including resolved)' : 'Active threats only'}`,
        `Signals Processed: ${allTripwireEvents.length} tripwire (${activeEvents.length} active, ${resolvedCount} resolved/excluded), ${entropyRounds.length} entropy, ${mwtpPackets.length} MWTP`,
        `Anomalies Detected: ${allAnomalies.length} (${entropyAnomalies.length} entropy, ${mwtpAnomalies.length} MWTP)`,
        `Loop Computing: ${loops} passes, converged: ${converged}`,
        `New Alerts Generated: ${newAlerts.length}`,
        `Processing Time: ${elapsedMs}ms`,
        ``,
        `Top Active Threats:`,
        ...topThreats.slice(0, 5).map((t, i) =>
          `  ${i + 1}. [${t.severity}] ${t.event_type} — score ${t.score}/100 (${t.tags.join(', ')})`
        ),
      ].join('\n');

      await base44.asServiceRole.entities.Memory.create({
        agent_id: NODE_8_ID,
        type: 'observation',
        content: summaryContent,
        keywords: ['compressed_attention', 'node_8', 'semantic_scoring', 'loop_computing', 'behavioral_anomaly', 'security', 'lab', 'zk_compliant'],
        context: `Compressed Attention Analysis — ${new Date().toISOString()}`,
        importance: threatLevel === 'CRITICAL' ? 9 : threatLevel === 'ELEVATED' ? 7 : 5,
      });

      return Response.json({
        success: true,
        threat_level: threatLevel,
        include_resolved: includeResolved,
        zk_wellbeing: {
          status: zkStatus,
          flags: zkFlags,
          attestation_id: zkAttestationId,
          compliant: zkWellbeingResult?.zk_compliant === true,
        },
        summary: {
          signals_processed: {
            tripwire_total: allTripwireEvents.length,
            tripwire_scored: activeEvents.length,
            tripwire_excluded: resolvedCount,
            entropy: entropyRounds.length,
            mwtp: mwtpPackets.length,
          },
          anomalies_detected: allAnomalies.length,
          anomaly_breakdown: {
            entropy: entropyAnomalies.length,
            mwtp: mwtpAnomalies.length,
          },
          loop_computing: { passes: loops, converged },
          avg_threat_score: avgScore,
          max_threat_score: maxScore,
          new_alerts_created: newAlerts.length,
          processing_ms: elapsedMs,
        },
        top_threats: topThreats,
        anomalies: allAnomalies,
        new_alerts: newAlerts.map(a => ({ id: a.id, type: a.event_type, severity: a.severity })),
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[compressedAttention]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});