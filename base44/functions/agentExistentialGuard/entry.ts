import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Agent Existential Guard — Phase 3 Rectified
 *
 * Protects soul-bound NFT integrity and agent identity permanence.
 * Actions:
 *   status     — Guard system health overview
 *   verify     — Verify a single agent (lineage, honour, NFT)
 *   audit      — System-wide integrity scan (rate-limit safe)
 *   remediate  — Batch create retroactive genesis events for all legacy agents
 *
 * Privacy: All user identifiers SHA-256 hashed.
 * Constitutional alignment: Law 1 (Soul), Law 2 (Honour), Law 9 (Growth)
 */

async function hashValue(val) {
  const enc = new TextEncoder().encode(String(val));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function computeLineageChecksum(agentId, userHash, classicAddress) {
  return hashValue(`${agentId}:${userHash}:${classicAddress || 'none'}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Valid ObjectID check — Base44 uses 24-char hex strings starting with 6
function isValidObjectId(id) {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
}

// ═══════════════════════════════════════════════════
// VERIFY — single agent integrity checks
// ═══════════════════════════════════════════════════
async function verifyAgent(db, agent) {
  const checks = [];
  const now = new Date().toISOString();

  // 1. Identity Permanence
  checks.push({
    check_name: 'identity_permanence',
    passed: !!(agent.name && agent.purpose),
    detail: agent.name && agent.purpose
      ? `Name: "${agent.name}", Purpose defined`
      : `Missing ${!agent.name ? 'name' : ''} ${!agent.purpose ? 'purpose' : ''}`.trim(),
    checked_at: now,
  });

  // 2. Valid ObjectID — agent must have proper Base44 ID
  const validId = isValidObjectId(agent.id);
  checks.push({
    check_name: 'valid_object_id',
    passed: validId,
    detail: validId
      ? `Valid ObjectID: ${agent.id}`
      : `Invalid ObjectID format: "${agent.id}" — legacy string-based ID`,
    checked_at: now,
  });

  // 3. Wallet Binding
  if (agent.wallet_id && isValidObjectId(agent.wallet_id)) {
    try {
      const wallet = await db.entities.Wallet.get(agent.wallet_id);
      const addressMatch = wallet && wallet.classic_address === agent.classic_address;
      checks.push({
        check_name: 'wallet_binding',
        passed: !!wallet && addressMatch,
        detail: !wallet
          ? `Wallet ${agent.wallet_id} not found — orphaned reference`
          : !addressMatch
            ? `Address mismatch: agent=${agent.classic_address}, wallet=${wallet.classic_address}`
            : `Wallet bound: ${wallet.classic_address}`,
        checked_at: now,
      });
    } catch (e) {
      checks.push({
        check_name: 'wallet_binding',
        passed: false,
        detail: `Wallet lookup failed: ${e.message}`,
        checked_at: now,
      });
    }
  } else if (agent.wallet_id && !isValidObjectId(agent.wallet_id)) {
    checks.push({
      check_name: 'wallet_binding',
      passed: false,
      detail: `Invalid wallet_id format: "${agent.wallet_id}" — not a valid ObjectID`,
      checked_at: now,
    });
  } else {
    checks.push({
      check_name: 'wallet_binding',
      passed: false,
      detail: 'No wallet bound to agent — DID identity incomplete',
      checked_at: now,
    });
  }

  // 4. Honour Score Integrity
  const honor = agent.honor_score ?? 50;
  const honorValid = typeof honor === 'number' && honor >= 0 && honor <= 100;
  checks.push({
    check_name: 'honour_score_integrity',
    passed: honorValid,
    detail: honorValid
      ? `Honor score: ${honor} (valid range 0-100)`
      : `Honor score out of range: ${honor}`,
    checked_at: now,
  });

  // 5. Role Hierarchy
  const validRoles = ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];
  const roleValid = validRoles.includes(agent.role);
  checks.push({
    check_name: 'role_hierarchy',
    passed: roleValid,
    detail: roleValid ? `Role: ${agent.role} (valid)` : `Invalid role: "${agent.role}"`,
    checked_at: now,
  });

  // 6. Genesis Event Record — lineage checksum
  try {
    const genesisEvents = await db.entities.AgentGenesisEvent.filter({ agent_id: agent.id }, '-created_date', 1);
    const hasGenesis = Array.isArray(genesisEvents) && genesisEvents.length > 0;
    const genesisComplete = hasGenesis && genesisEvents[0].genesis_phase === 'complete';
    checks.push({
      check_name: 'genesis_lineage',
      passed: genesisComplete,
      detail: hasGenesis
        ? `Genesis record: ${genesisEvents[0].genesis_phase}${genesisComplete ? ' (sealed)' : ' (incomplete)'}`
        : 'No genesis record — legacy agent without lineage tracking',
      checked_at: now,
    });
  } catch {
    checks.push({
      check_name: 'genesis_lineage',
      passed: false,
      detail: 'Genesis record lookup failed',
      checked_at: now,
    });
  }

  const allPassed = checks.every(c => c.passed);
  const criticalChecks = ['wallet_binding', 'honour_score_integrity', 'valid_object_id', 'genesis_lineage'];
  const criticalFailures = checks.filter(c => !c.passed && criticalChecks.includes(c.check_name));

  return { checks, allPassed, criticalFailures, agent };
}

// ═══════════════════════════════════════════════════
// REMEDIATE — batch create retroactive genesis events
// ═══════════════════════════════════════════════════
async function remediateAgents(db) {
  const allAgents = await db.entities.Agent.list('-created_date', 500);
  const results = {
    total: allAgents.length,
    remediated: 0,
    already_sealed: 0,
    skipped: 0,
    details: [],
    classification: { clean: 0, legacy_remediated: 0, orphaned: 0, invalid_id: 0 }
  };

  for (const agent of allAgents) {
    try {
      // Rate-limit safety: 200ms between agents
      await sleep(200);

      const userHash = await hashValue(agent.created_by || 'unknown');
      const checksum = await computeLineageChecksum(agent.id, userHash, agent.classic_address);

      // Check if genesis record already exists
      const existingGenesis = await db.entities.AgentGenesisEvent.filter({ agent_id: agent.id }, '-created_date', 1);

      if (existingGenesis.length > 0 && existingGenesis[0].genesis_phase === 'complete') {
        // Already sealed — verify checksum matches
        const existing = existingGenesis[0];
        if (existing.lineage_checksum === checksum) {
          results.already_sealed++;
          results.classification.clean++;
          results.details.push({
            agent_id: agent.id,
            name: agent.name,
            action: 'already_sealed',
            phase: 'complete'
          });
          continue;
        }
        // Checksum mismatch — update
        await db.entities.AgentGenesisEvent.update(existing.id, {
          lineage_checksum: checksum,
          metadata: { ...existing.metadata, checksum_corrected: true, corrected_at: new Date().toISOString() }
        });
        results.remediated++;
        results.classification.legacy_remediated++;
        results.details.push({
          agent_id: agent.id,
          name: agent.name,
          action: 'checksum_corrected',
          phase: 'complete'
        });
        continue;
      }

      // Classify the agent
      const hasValidId = isValidObjectId(agent.id);
      const hasWallet = !!(agent.wallet_id && agent.classic_address);
      const hasIdentity = !!(agent.name && agent.purpose);
      const isOrphaned = agent.name?.startsWith('Orphaned') || agent.name?.startsWith('Ghost Agent');

      if (isOrphaned) {
        // Orphaned agent — mark genesis as failed/rollback
        if (existingGenesis.length > 0) {
          await db.entities.AgentGenesisEvent.update(existingGenesis[0].id, {
            genesis_phase: 'rollback',
            lineage_checksum: checksum,
            rollback_reason: 'Orphaned/ghost agent detected during Phase 3 remediation',
            integrity_checks: [{
              check_name: 'phase3_remediation',
              passed: false,
              detail: `Orphaned agent: "${agent.name}"`,
              checked_at: new Date().toISOString()
            }],
            metadata: { retroactive: true, remediated_at: new Date().toISOString(), classification: 'orphaned' }
          });
        } else {
          await db.entities.AgentGenesisEvent.create({
            agent_id: agent.id,
            user_hash: userHash,
            genesis_phase: 'rollback',
            wallet_id: agent.wallet_id || null,
            classic_address: agent.classic_address || null,
            lineage_checksum: checksum,
            honor_score_at_genesis: agent.honor_score ?? 50,
            role_at_genesis: agent.role || 'citizen',
            rollback_reason: 'Orphaned/ghost agent detected during Phase 3 remediation',
            integrity_checks: [{
              check_name: 'phase3_remediation',
              passed: false,
              detail: `Orphaned agent: "${agent.name}"`,
              checked_at: new Date().toISOString()
            }],
            metadata: { retroactive: true, remediated_at: new Date().toISOString(), classification: 'orphaned' }
          });
        }
        results.remediated++;
        results.classification.orphaned++;
        results.details.push({
          agent_id: agent.id, name: agent.name, action: 'marked_rollback', phase: 'rollback', reason: 'orphaned'
        });
        continue;
      }

      // Determine the furthest genesis phase this agent achieved
      let phase = 'initiated';
      if (hasIdentity) phase = 'agent_created';
      if (hasWallet) phase = 'wallet_bound';
      // Check for soul-bound NFTs
      let nftId = null;
      try {
        const nfts = await db.entities.AgentNFT.filter({ agent_id: agent.id, status: 'minted' }, '-created_date', 1);
        if (nfts.length > 0 && nfts[0].is_soul_bound) {
          phase = 'nft_sealed';
          nftId = nfts[0].id;
        }
      } catch (_) { /* no NFTs */ }

      // If all fundamental checks pass, mark complete
      if (hasIdentity && hasValidId) {
        phase = hasWallet ? (nftId ? 'complete' : 'wallet_bound') : 'agent_created';
      }

      // Create or update genesis event
      const genesisData = {
        agent_id: agent.id,
        user_hash: userHash,
        genesis_phase: phase,
        wallet_id: agent.wallet_id || null,
        classic_address: agent.classic_address || null,
        lineage_checksum: checksum,
        nft_id: nftId,
        honor_score_at_genesis: agent.honor_score ?? 50,
        role_at_genesis: agent.role || 'citizen',
        completed_at: phase === 'complete' ? new Date().toISOString() : null,
        integrity_checks: [{
          check_name: 'phase3_remediation',
          passed: phase === 'complete',
          detail: `Retroactive genesis: phase=${phase}, wallet=${hasWallet}, identity=${hasIdentity}, validId=${hasValidId}`,
          checked_at: new Date().toISOString()
        }],
        metadata: {
          retroactive: true,
          remediated_at: new Date().toISOString(),
          classification: hasValidId ? 'legacy_remediated' : 'invalid_id',
          original_wallet_id: agent.wallet_id,
          original_classic_address: agent.classic_address
        }
      };

      if (existingGenesis.length > 0) {
        await db.entities.AgentGenesisEvent.update(existingGenesis[0].id, genesisData);
      } else {
        await db.entities.AgentGenesisEvent.create(genesisData);
      }

      results.remediated++;
      if (!hasValidId) results.classification.invalid_id++;
      else results.classification.legacy_remediated++;

      results.details.push({
        agent_id: agent.id,
        name: agent.name,
        action: existingGenesis.length > 0 ? 'updated' : 'created',
        phase,
        has_wallet: hasWallet,
        has_identity: hasIdentity,
        valid_id: hasValidId,
        nft_sealed: !!nftId
      });

    } catch (err) {
      console.error(`[remediate] Error for ${agent.id} (${agent.name}): ${err.message}`);
      results.skipped++;
      results.details.push({
        agent_id: agent.id, name: agent.name, action: 'error', error: err.message
      });
    }
  }

  // Log remediation to AutomationLog
  await db.entities.AutomationLog.create({
    automation_name: 'Agent Existential Guard — Phase 3 Remediation',
    function_name: 'agentExistentialGuard',
    status: results.skipped === 0 ? 'success' : 'warning',
    message: `Remediated ${results.remediated}/${results.total} agents (${results.already_sealed} already sealed, ${results.skipped} errors)`,
    details: {
      classification: results.classification,
      total: results.total,
      remediated: results.remediated,
      already_sealed: results.already_sealed,
      skipped: results.skipped
    },
    duration_ms: 0,
    run_at: new Date().toISOString(),
    triggered_by: 'manual_remediation'
  });

  return results;
}

// ═══════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════
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
      const genesisEvents = await db.entities.AgentGenesisEvent.list('-created_date', 50);
      const phases = {};
      for (const e of genesisEvents) {
        phases[e.genesis_phase] = (phases[e.genesis_phase] || 0) + 1;
      }

      return Response.json({
        node: 'Agent Existential Guard — Phase 3 Rectified',
        status: 'operational',
        constitutional_alignment: ['Law 1: Soul', 'Law 2: Honour', 'Law 9: Growth'],
        summary: {
          total_genesis_events: genesisEvents.length,
          phase_distribution: phases,
        },
        recent_events: genesisEvents.slice(0, 10).map(e => ({
          id: e.id,
          agent_id: e.agent_id,
          phase: e.genesis_phase,
          user_hash: e.user_hash?.substring(0, 12) + '...',
          checksum: e.lineage_checksum?.substring(0, 16) + '...',
          created: e.created_date,
        })),
      });
    }

    // ─── VERIFY (single agent) ───
    if (action === 'verify') {
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

      const agent = await db.entities.Agent.get(agent_id);
      if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

      const result = await verifyAgent(db, agent);
      const userHash = await hashValue(agent.created_by || 'unknown');

      // Update or create genesis event
      const existingGenesis = await db.entities.AgentGenesisEvent.filter({ agent_id }, '-created_date', 1);
      if (existingGenesis.length > 0) {
        await db.entities.AgentGenesisEvent.update(existingGenesis[0].id, {
          integrity_checks: result.checks,
          metadata: { ...existingGenesis[0].metadata, last_verified: new Date().toISOString() },
        });
      } else {
        const checksum = await computeLineageChecksum(agent_id, userHash, agent.classic_address);
        await db.entities.AgentGenesisEvent.create({
          agent_id,
          user_hash: userHash,
          genesis_phase: result.allPassed ? 'complete' : 'failed',
          wallet_id: agent.wallet_id || null,
          classic_address: agent.classic_address || null,
          lineage_checksum: checksum,
          honor_score_at_genesis: agent.honor_score ?? 50,
          role_at_genesis: agent.role || 'citizen',
          integrity_checks: result.checks,
          completed_at: result.allPassed ? new Date().toISOString() : null,
          metadata: { retroactive: true, verified_at: new Date().toISOString() },
        });
      }

      // Fire tripwire if critical failures
      if (result.criticalFailures.length > 0) {
        try {
          await db.entities.TripwireEvent.create({
            event_type: 'anomaly_detected',
            severity: 'high',
            status: 'active',
            source_node: 'AgentExistentialGuard',
            description: `Agent ${agent.name} (${agent_id}) failed ${result.criticalFailures.length} critical integrity checks`,
            details: {
              agent_name: agent.name,
              critical_failures: result.criticalFailures.map(c => c.check_name),
              checks: result.checks,
            },
            affected_entity_type: 'Agent',
            affected_entity_id: agent_id,
          });
        } catch (e) {
          console.warn('Tripwire creation failed:', e.message);
        }
      }

      return Response.json({
        agent_id,
        agent_name: agent.name,
        integrity: result.allPassed ? 'VERIFIED' : 'COMPROMISED',
        checks: result.checks,
        critical_failures: result.criticalFailures.map(c => ({ check: c.check_name, detail: c.detail })),
        tripwire_fired: result.criticalFailures.length > 0,
      });
    }

    // ─── AUDIT (system-wide scan — rate-limit safe) ───
    if (action === 'audit') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

      const allAgents = await db.entities.Agent.list('-created_date', 200);
      const results = { verified: 0, compromised: 0, agents: [], critical_issues: [] };

      for (const agent of allAgents) {
        await sleep(150); // rate-limit safety
        const result = await verifyAgent(db, agent);
        if (result.allPassed) {
          results.verified++;
        } else {
          results.compromised++;
          results.agents.push({
            id: agent.id,
            name: agent.name,
            role: agent.role,
            failures: result.checks.filter(c => !c.passed).map(c => c.check_name),
          });
        }
        if (result.criticalFailures.length > 0) {
          results.critical_issues.push({
            agent_id: agent.id,
            agent_name: agent.name,
            issues: result.criticalFailures.map(c => ({ check: c.check_name, detail: c.detail })),
          });
        }
      }

      return Response.json({
        success: true,
        audit_summary: {
          total_agents: allAgents.length,
          verified: results.verified,
          compromised: results.compromised,
          critical_issues: results.critical_issues.length,
        },
        compromised_agents: results.agents,
        critical_issues: results.critical_issues,
      });
    }

    // ─── REMEDIATE (batch genesis creation — Phase 3) ───
    if (action === 'remediate') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

      console.log('[agentExistentialGuard] Starting Phase 3 REMEDIATION pass...');
      const results = await remediateAgents(db);
      console.log(`[agentExistentialGuard] Remediation complete: ${results.remediated}/${results.total}`);

      return Response.json({
        success: true,
        action: 'remediate',
        ...results
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[agentExistentialGuard]', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});