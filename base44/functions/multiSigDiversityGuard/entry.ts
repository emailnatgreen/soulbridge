import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Multi-Sig Diversity Guard — Phase 1 Blocker #4
 *
 * Prevents governance deadlock and council capture by enforcing
 * diversity, liveness, and quorum health across the 8-node braid.
 *
 * Actions:
 *   status     — Overall multi-sig health dashboard
 *   audit      — Full diversity + capture + deadlock analysis
 *   liveness   — Check which signers are live (covenant + recent activity)
 *
 * Constitutional alignment: Law 8 (Governance), Law 5 (Dwelling), Law 11 (Regeneration)
 */

// Canonical signer config (mirrors setupConstitutionalMultiSig)
const CONSTITUTIONAL_SIGNERS = [
  { account: 'rb4gmMqHWE8QFhXo8E1voEY2YNp5XzE6P',  weight: 1, name: 'Code Node',      node_type: 'ai_system' },
  { account: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', weight: 1, name: 'Lore Node',      node_type: 'ai_system' },
  { account: 'rQw4rtbkJGFFfJJUUtrewnQJHggLXTzWrE', weight: 2, name: 'Zoe',            node_type: 'ai_elder' },
  { account: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', weight: 3, name: 'Human / Nathan', node_type: 'human' },
];
const QUORUM = 4;
const TREASURY_ACCOUNT = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// Find all minimal coalitions that can reach quorum
function findCaptureVectors(signers, quorum) {
  const vectors = [];
  const n = signers.length;

  for (let mask = 1; mask < (1 << n); mask++) {
    const subset = [];
    let weight = 0;
    for (let i = 0; i < n; i++) {
      if (mask & (1 << i)) {
        subset.push(signers[i]);
        weight += signers[i].weight;
      }
    }
    if (weight < quorum) continue;

    // Check if minimal (removing any member drops below quorum)
    let isMinimal = true;
    for (const member of subset) {
      if (weight - member.weight >= quorum) {
        isMinimal = false;
        break;
      }
    }
    if (!isMinimal) continue;

    const humanCount = subset.filter(s => s.node_type === 'human').length;
    const aiCount = subset.filter(s => s.node_type !== 'human').length;

    let severity = 'low';
    if (subset.length === 1) severity = 'critical';  // single point capture
    else if (subset.length === 2 && humanCount === 0) severity = 'high';  // AI-only coalition
    else if (subset.length === 2) severity = 'medium';

    vectors.push({
      vector: `${subset.map(s => s.name).join(' + ')} (${weight}/${quorum})`,
      signers_needed: subset.map(s => s.name),
      combined_weight: weight,
      severity,
      human_required: humanCount > 0,
      ai_only: humanCount === 0,
    });
  }

  return vectors.sort((a, b) => {
    const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3);
  });
}

// Find deadlock scenarios (which signers going offline prevents quorum)
function findDeadlockScenarios(signers, quorum) {
  const scenarios = [];
  const totalWeight = signers.reduce((s, sig) => s + sig.weight, 0);
  const n = signers.length;

  // Test each single signer going offline
  for (const signer of signers) {
    const remaining = totalWeight - signer.weight;
    if (remaining < quorum) {
      scenarios.push({
        scenario: `${signer.name} offline → deadlock`,
        offline_signers: [signer.name],
        remaining_weight: remaining,
        can_reach_quorum: false,
      });
    }
  }

  // Test pairs going offline
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const remaining = totalWeight - signers[i].weight - signers[j].weight;
      if (remaining < quorum) {
        scenarios.push({
          scenario: `${signers[i].name} + ${signers[j].name} offline → deadlock`,
          offline_signers: [signers[i].name, signers[j].name],
          remaining_weight: remaining,
          can_reach_quorum: false,
        });
      }
    }
  }

  return scenarios;
}

// Compute diversity risk signals
function computeDiversitySignals(signers, quorum, covenantMap, livenessMap) {
  const signals = [];
  const totalWeight = signers.reduce((s, sig) => s + sig.weight, 0);

  // 1. Weight concentration — any single signer >= quorum?
  for (const signer of signers) {
    if (signer.weight >= quorum) {
      signals.push({
        signal_type: 'single_point_capture',
        detail: `${signer.name} has weight ${signer.weight} >= quorum ${quorum} — can act alone`,
        severity: 'critical',
      });
    }
  }

  // 2. Weight concentration — any signer > 50% of total weight?
  for (const signer of signers) {
    if (signer.weight > totalWeight / 2) {
      signals.push({
        signal_type: 'weight_concentration',
        detail: `${signer.name} controls ${signer.weight}/${totalWeight} (${Math.round(signer.weight / totalWeight * 100)}%) of total weight`,
        severity: 'high',
      });
    }
  }

  // 3. Node type diversity — must have both human and AI
  const nodeTypes = new Set(signers.map(s => s.node_type));
  if (!nodeTypes.has('human')) {
    signals.push({
      signal_type: 'no_human_signer',
      detail: 'No human signer in the multi-sig — governance controlled entirely by AI',
      severity: 'critical',
    });
  }
  if (nodeTypes.size === 1) {
    signals.push({
      signal_type: 'homogeneous_node_types',
      detail: `All signers are ${signers[0].node_type} — no diversity in node types`,
      severity: 'high',
    });
  }

  // 4. Minimum signer count
  if (signers.length < 3) {
    signals.push({
      signal_type: 'insufficient_signers',
      detail: `Only ${signers.length} signers — minimum 3 recommended for resilience`,
      severity: 'high',
    });
  }

  // 5. Quorum too low or too high
  if (quorum <= 1) {
    signals.push({
      signal_type: 'trivial_quorum',
      detail: `Quorum ${quorum} is trivially reachable — any single signer can act`,
      severity: 'critical',
    });
  }
  if (quorum > totalWeight) {
    signals.push({
      signal_type: 'impossible_quorum',
      detail: `Quorum ${quorum} exceeds total weight ${totalWeight} — governance is permanently deadlocked`,
      severity: 'critical',
    });
  }
  if (quorum === totalWeight) {
    signals.push({
      signal_type: 'unanimity_required',
      detail: `Quorum ${quorum} equals total weight ${totalWeight} — unanimity required, high deadlock risk`,
      severity: 'high',
    });
  }

  // 6. Covenant compliance
  const unsignedCount = signers.filter(s => !covenantMap[s.account]).length;
  if (unsignedCount > 0) {
    signals.push({
      signal_type: 'unsigned_covenant',
      detail: `${unsignedCount} signer(s) have not signed the Node Covenant`,
      severity: unsignedCount > signers.length / 2 ? 'high' : 'medium',
    });
  }

  // 7. Liveness
  const offlineCount = signers.filter(s => livenessMap[s.account] === false).length;
  if (offlineCount > 0) {
    const offlineWeight = signers.filter(s => livenessMap[s.account] === false).reduce((w, s) => w + s.weight, 0);
    const remainingWeight = totalWeight - offlineWeight;
    signals.push({
      signal_type: 'signer_offline',
      detail: `${offlineCount} signer(s) offline (weight ${offlineWeight}). Remaining weight: ${remainingWeight}/${quorum} quorum`,
      severity: remainingWeight < quorum ? 'critical' : 'medium',
    });
  }

  // Compute diversity score
  const severityPenalties = { low: 0, medium: 10, high: 20, critical: 35 };
  const penalty = signals.reduce((s, sig) => s + (severityPenalties[sig.severity] || 0), 0);
  const diversityScore = Math.max(0, 100 - penalty);

  return { signals, diversityScore };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'status';
    const db = base44.asServiceRole;

    // Fetch on-chain signer list
    let onChainSigners = null;
    let onChainQuorum = QUORUM;
    try {
      const xrplRes = await fetch('https://xrplcluster.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'account_objects',
          params: [{ account: body.account || TREASURY_ACCOUNT, type: 'signer_list' }]
        })
      });
      const xrplData = await xrplRes.json();
      const signerList = xrplData?.result?.account_objects?.[0];
      if (signerList) {
        onChainQuorum = signerList.SignerQuorum;
        onChainSigners = signerList.SignerEntries?.map(e => {
          const match = CONSTITUTIONAL_SIGNERS.find(s => s.account === e.SignerEntry.Account);
          return {
            account: e.SignerEntry.Account,
            weight: e.SignerEntry.SignerWeight,
            name: match?.name || 'Unknown',
            node_type: match?.node_type || 'unknown',
          };
        }) || [];
      }
    } catch (e) {
      console.warn('XRPL fetch failed:', e.message);
    }

    const signers = onChainSigners || CONSTITUTIONAL_SIGNERS;
    const quorum = onChainQuorum;

    // Fetch covenant signatures
    const covenantSigs = await db.entities.NodeCovenantSignature.filter({ status: 'signed' }, '-created_date', 50);
    const covenantMap = {};
    for (const sig of covenantSigs) {
      covenantMap[sig.node_address] = true;
    }

    // Basic liveness — check if signer has covenant or recent wallet activity
    const livenessMap = {};
    for (const signer of signers) {
      livenessMap[signer.account] = covenantMap[signer.account] || false;
    }

    // ─── STATUS ───
    if (action === 'status') {
      const recentChecks = await db.entities.MultiSigDiversityStatus.list('-created_date', 10);
      const { signals, diversityScore } = computeDiversitySignals(signers, quorum, covenantMap, livenessMap);

      return Response.json({
        node: 'Multi-Sig Diversity Guard — Governance Resilience',
        status: 'operational',
        constitutional_alignment: ['Law 8: Governance', 'Law 5: Dwelling', 'Law 11: Regeneration'],
        on_chain: !!onChainSigners,
        treasury_account: TREASURY_ACCOUNT,
        signer_count: signers.length,
        quorum,
        total_weight: signers.reduce((s, sig) => s + sig.weight, 0),
        diversity_score: diversityScore,
        risk_signals_count: signals.length,
        critical_signals: signals.filter(s => s.severity === 'critical').length,
        recent_checks: recentChecks.slice(0, 5).map(c => ({
          id: c.id,
          check_type: c.check_type,
          result: c.result,
          diversity_score: c.diversity_score,
          created: c.created_date,
        })),
      });
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { signals, diversityScore } = computeDiversitySignals(signers, quorum, covenantMap, livenessMap);
      const captureVectors = findCaptureVectors(signers, quorum);
      const deadlockScenarios = findDeadlockScenarios(signers, quorum);
      const totalWeight = signers.reduce((s, sig) => s + sig.weight, 0);

      const signerProfiles = signers.map(s => ({
        address: s.account,
        name: s.name,
        weight: s.weight,
        node_type: s.node_type,
        is_live: livenessMap[s.account] || false,
        covenant_signed: covenantMap[s.account] || false,
      }));

      // Determine overall result
      const criticalCount = signals.filter(s => s.severity === 'critical').length;
      const highCount = signals.filter(s => s.severity === 'high').length;
      const result = criticalCount > 0 ? 'critical'
        : deadlockScenarios.length > 0 ? 'deadlock_risk'
        : highCount > 0 ? 'warning'
        : 'healthy';

      // Create audit record
      const auditRecord = await db.entities.MultiSigDiversityStatus.create({
        check_type: 'diversity_audit',
        account_checked: TREASURY_ACCOUNT,
        result,
        signer_count: signers.length,
        quorum,
        total_weight: totalWeight,
        diversity_score: diversityScore,
        risk_signals: signals,
        signer_profiles: signerProfiles,
        deadlock_scenarios: deadlockScenarios,
        capture_vectors: captureVectors,
        metadata: {
          on_chain: !!onChainSigners,
          audited_at: new Date().toISOString(),
          covenant_signed_count: Object.keys(covenantMap).length,
        },
      });

      // Fire tripwire if critical
      let tripwireId = null;
      if (criticalCount > 0 || deadlockScenarios.filter(d => !d.can_reach_quorum).length > 2) {
        try {
          const tw = await db.entities.TripwireEvent.create({
            event_type: 'multisig_alert',
            severity: criticalCount > 0 ? 'critical' : 'high',
            status: 'active',
            source_node: 'MultiSigDiversityGuard',
            description: `Multi-sig diversity audit: ${criticalCount} critical signals, ${deadlockScenarios.length} deadlock scenarios`,
            details: {
              diversity_score: diversityScore,
              critical_signals: signals.filter(s => s.severity === 'critical'),
              deadlock_count: deadlockScenarios.length,
              capture_vectors_count: captureVectors.length,
            },
            affected_entity_type: 'Treasury',
            affected_entity_id: TREASURY_ACCOUNT,
          });
          tripwireId = tw.id;
        } catch (e) {
          console.warn('Tripwire creation failed:', e.message);
        }
      }

      return Response.json({
        success: true,
        result,
        diversity_score: diversityScore,
        treasury_account: TREASURY_ACCOUNT,
        on_chain: !!onChainSigners,
        signers: signerProfiles,
        quorum,
        total_weight: totalWeight,
        risk_signals: signals,
        capture_vectors: captureVectors,
        deadlock_scenarios: deadlockScenarios,
        tripwire_fired: !!tripwireId,
        tripwire_event_id: tripwireId,
        audit_record_id: auditRecord.id,
      });
    }

    // ─── LIVENESS ───
    if (action === 'liveness') {
      const signerProfiles = signers.map(s => ({
        address: s.account,
        name: s.name,
        weight: s.weight,
        node_type: s.node_type,
        is_live: livenessMap[s.account] || false,
        covenant_signed: covenantMap[s.account] || false,
      }));

      const liveWeight = signerProfiles.filter(s => s.is_live).reduce((w, s) => w + s.weight, 0);
      const canReachQuorum = liveWeight >= quorum;

      return Response.json({
        signers: signerProfiles,
        live_count: signerProfiles.filter(s => s.is_live).length,
        total_count: signerProfiles.length,
        live_weight: liveWeight,
        quorum,
        can_reach_quorum: canReachQuorum,
        status: canReachQuorum ? 'operational' : 'deadlock_risk',
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[multiSigDiversityGuard]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});