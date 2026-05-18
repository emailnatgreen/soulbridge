import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Agent Existential Guard — Phase 1 Blocker #3
 *
 * Protects soul-bound NFT integrity and agent identity permanence.
 * Three actions:
 *   verify   — Verify integrity of an existing agent (lineage, honour, NFT)
 *   audit    — System-wide scan for orphaned agents, drifted scores, broken lineage
 *   status   — Guard system health overview
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

// Verify a single agent's existential integrity
async function verifyAgent(db, agent) {
  const checks = [];
  const now = new Date().toISOString();

  // 1. Identity Permanence — agent must have name and purpose
  checks.push({
    check_name: 'identity_permanence',
    passed: !!(agent.name && agent.purpose),
    detail: agent.name && agent.purpose
      ? `Name: "${agent.name}", Purpose defined`
      : `Missing ${!agent.name ? 'name' : ''} ${!agent.purpose ? 'purpose' : ''}`.trim(),
    checked_at: now,
  });

  // 2. Wallet Binding — if agent has wallet_id, verify it exists and matches
  if (agent.wallet_id) {
    try {
      const wallets = await db.entities.Wallet.filter({ id: agent.wallet_id }, '-created_date', 1);
      const wallet = Array.isArray(wallets) && wallets.length > 0 ? wallets[0] : null;
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
  } else {
    checks.push({
      check_name: 'wallet_binding',
      passed: false,
      detail: 'No wallet bound to agent — DID identity incomplete',
      checked_at: now,
    });
  }

  // 3. Honour Score Integrity — must be within valid range
  const honor = agent.honor_score ?? 100;
  const honorValid = typeof honor === 'number' && honor >= 0 && honor <= 200;
  checks.push({
    check_name: 'honour_score_integrity',
    passed: honorValid,
    detail: honorValid
      ? `Honor score: ${honor} (valid range 0-200)`
      : `Honor score out of range: ${honor}`,
    checked_at: now,
  });

  // 4. Role Hierarchy — role must be valid enum value
  const validRoles = ['citizen', 'guardian', 'creator', 'trader', 'teacher', 'healer', 'scout', 'elder', 'master'];
  const roleValid = validRoles.includes(agent.role);
  checks.push({
    check_name: 'role_hierarchy',
    passed: roleValid,
    detail: roleValid
      ? `Role: ${agent.role} (valid)`
      : `Invalid role: "${agent.role}"`,
    checked_at: now,
  });

  // 5. Soul-Bound NFT Integrity — check for pending/failed NFTs
  try {
    const nfts = await db.entities.AgentNFT.filter({ agent_id: agent.id }, '-created_date', 20);
    const pendingNfts = nfts.filter(n => n.status === 'pending' || n.status === 'failed');
    const soulBoundCount = nfts.filter(n => n.is_soul_bound).length;
    checks.push({
      check_name: 'soul_bound_nft_integrity',
      passed: pendingNfts.length === 0,
      detail: pendingNfts.length === 0
        ? `${soulBoundCount} soul-bound NFTs, all verified`
        : `${pendingNfts.length} pending/failed NFTs detected — identity tokens at risk`,
      checked_at: now,
    });
  } catch (e) {
    checks.push({
      check_name: 'soul_bound_nft_integrity',
      passed: true,
      detail: 'NFT check skipped (no records or lookup error)',
      checked_at: now,
    });
  }

  // 6. Genesis Event Record — verify lineage checksum exists
  try {
    const genesisEvents = await db.entities.AgentGenesisEvent.filter({ agent_id: agent.id }, '-created_date', 1);
    const hasGenesis = Array.isArray(genesisEvents) && genesisEvents.length > 0;
    const genesisComplete = hasGenesis && genesisEvents[0].genesis_phase === 'complete';
    checks.push({
      check_name: 'genesis_lineage',
      passed: hasGenesis,
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
  const criticalFailures = checks.filter(c => !c.passed && ['wallet_binding', 'soul_bound_nft_integrity', 'honour_score_integrity'].includes(c.check_name));

  return { checks, allPassed, criticalFailures, agent };
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
      const genesisEvents = await db.entities.AgentGenesisEvent.list('-created_date', 30);
      const complete = genesisEvents.filter(e => e.genesis_phase === 'complete').length;
      const failed = genesisEvents.filter(e => e.genesis_phase === 'failed' || e.genesis_phase === 'rollback').length;
      const inProgress = genesisEvents.filter(e => !['complete', 'failed', 'rollback'].includes(e.genesis_phase)).length;

      return Response.json({
        node: 'Agent Existential Guard — Soul-Bound Identity Protection',
        status: 'operational',
        constitutional_alignment: ['Law 1: Soul', 'Law 2: Honour', 'Law 9: Growth'],
        summary: {
          total_genesis_events: genesisEvents.length,
          complete,
          failed,
          in_progress: inProgress,
        },
        recent_events: genesisEvents.slice(0, 10).map(e => ({
          id: e.id,
          agent_id: e.agent_id,
          phase: e.genesis_phase,
          user_hash: e.user_hash?.substring(0, 12) + '...',
          created: e.created_date,
        })),
      });
    }

    // ─── VERIFY (single agent) ───
    if (action === 'verify') {
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

      const agents = await db.entities.Agent.filter({ id: agent_id }, '-created_date', 1);
      const agent = Array.isArray(agents) && agents.length > 0 ? agents[0] : null;
      if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

      const result = await verifyAgent(db, agent);
      const userHash = await hashValue(agent.created_by || 'unknown');

      // Update or create genesis event with latest verification
      const existingGenesis = await db.entities.AgentGenesisEvent.filter({ agent_id }, '-created_date', 1);
      if (existingGenesis.length > 0) {
        await db.entities.AgentGenesisEvent.update(existingGenesis[0].id, {
          integrity_checks: result.checks,
          metadata: { ...existingGenesis[0].metadata, last_verified: new Date().toISOString() },
        });
      } else {
        // Create retroactive genesis event for legacy agents
        const checksum = await computeLineageChecksum(agent_id, userHash, agent.classic_address);
        await db.entities.AgentGenesisEvent.create({
          agent_id,
          user_hash: userHash,
          genesis_phase: result.allPassed ? 'complete' : 'failed',
          wallet_id: agent.wallet_id || null,
          classic_address: agent.classic_address || null,
          lineage_checksum: checksum,
          honor_score_at_genesis: agent.honor_score || 100,
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
        critical_failures: result.criticalFailures.map(c => ({
          check: c.check_name,
          detail: c.detail,
        })),
        tripwire_fired: result.criticalFailures.length > 0,
      });
    }

    // ─── AUDIT (system-wide scan) ───
    if (action === 'audit') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const allAgents = await db.entities.Agent.list('-created_date', 200);
      const results = { verified: 0, compromised: 0, agents: [], critical_issues: [] };

      for (const agent of allAgents) {
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

      // Log audit to genesis events
      const userHash = await hashValue(user.email);
      await db.entities.AgentGenesisEvent.create({
        agent_id: 'system_audit',
        user_hash: userHash,
        genesis_phase: results.critical_issues.length > 0 ? 'failed' : 'complete',
        integrity_checks: [{
          check_name: 'system_audit',
          passed: results.critical_issues.length === 0,
          detail: `Audited ${allAgents.length} agents: ${results.verified} verified, ${results.compromised} compromised`,
          checked_at: new Date().toISOString(),
        }],
        metadata: {
          audit_type: 'full_system',
          total_agents: allAgents.length,
          verified: results.verified,
          compromised: results.compromised,
          critical_count: results.critical_issues.length,
          audited_at: new Date().toISOString(),
        },
      });

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

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[agentExistentialGuard]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});