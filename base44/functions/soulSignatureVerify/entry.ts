import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Soul Signature Verify — Phase 2: Reverse-Coding Verification
 *
 * Before an agent executes a significant action, this function verifies
 * the proposed action aligns with the agent's stored "Soul Signature":
 *   - Purpose alignment
 *   - Role permissions check
 *   - Specialization match
 *   - Personality coherence
 *   - Honour standing
 *
 * Actions:
 *   verify   — Verify a proposed action against the agent's Soul Signature
 *   profile  — Return an agent's computed Soul Signature
 *   audit    — Return recent verification audit trail
 *
 * Every verification is logged immutably to Memory.
 * Denied actions generate TripwireEvents.
 *
 * Depends on: Phase 1 (hydrogeoContextGate) for sincerity pre-check.
 */

const SOUL_GATE_AGENT_ID = 'soul-signature-gate';

// Action categories and which roles/permissions they require
const ACTION_PERMISSION_MAP = {
  send_xrp:           { permission: 'can_send_xrp',        min_honour: 20 },
  access_treasury:    { permission: 'can_access_treasury',  min_honour: 60 },
  create_agent:       { permission: 'can_create_agents',    min_honour: 40 },
  evaluate_agent:     { permission: 'can_evaluate_agents',  min_honour: 30 },
  cast_vote:          { permission: 'can_vote',             min_honour: 10 },
  create_proposal:    { roles: ['guardian', 'creator', 'elder', 'master'], min_honour: 30 },
  execute_proposal:   { roles: ['guardian', 'elder', 'master'], min_honour: 50 },
  modify_governance:  { roles: ['elder', 'master'],         min_honour: 70 },
  mint_nft:           { roles: ['creator', 'guardian', 'elder', 'master'], min_honour: 25 },
  deploy_service:     { specializations: ['XRPL Development', 'Smart Contract Audit'], min_honour: 35 },
  security_action:    { specializations: ['Security'], min_honour: 50 },
};

// ─── Soul Signature Extraction ───
function extractSoulSignature(agent) {
  return {
    name: agent.name,
    purpose: agent.purpose || '',
    role: agent.role || 'citizen',
    personality: agent.personality || '',
    specializations: agent.specializations || [],
    permissions: agent.permissions || {},
    honour: agent.honor_score || 0,
    status: agent.status || 'unknown',
    core_skills: (agent.core_skills || []).map(s => s.name),
    warnings_count: (agent.warnings || []).length,
  };
}

// ─── Purpose Alignment Score ───
function scorePurposeAlignment(soulSig, proposedAction, actionContext) {
  const purposeWords = soulSig.purpose.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const actionText = `${proposedAction} ${actionContext}`.toLowerCase();

  if (purposeWords.length === 0) return { score: 50, reason: 'No purpose defined — neutral alignment' };

  let matches = 0;
  const matchedWords = [];
  for (const word of purposeWords) {
    if (actionText.includes(word)) {
      matches++;
      matchedWords.push(word);
    }
  }

  const ratio = matches / purposeWords.length;
  const score = Math.round(30 + (ratio * 70)); // 30-100 range

  return {
    score,
    matched_keywords: matchedWords,
    total_purpose_keywords: purposeWords.length,
    reason: score >= 60 ? 'Action aligns with stated purpose' : 'Weak alignment with stated purpose',
  };
}

// ─── Permission Gate ───
function checkPermissionGate(soulSig, actionType) {
  const mapping = ACTION_PERMISSION_MAP[actionType];
  if (!mapping) {
    return { passed: true, reason: 'No permission mapping for this action type — allowed by default' };
  }

  const failures = [];

  // Honour check
  if (mapping.min_honour && soulSig.honour < mapping.min_honour) {
    failures.push(`Honour ${soulSig.honour} below required ${mapping.min_honour}`);
  }

  // Direct permission check
  if (mapping.permission && !soulSig.permissions[mapping.permission]) {
    failures.push(`Missing permission: ${mapping.permission}`);
  }

  // Role check
  if (mapping.roles && !mapping.roles.includes(soulSig.role)) {
    failures.push(`Role '${soulSig.role}' not in allowed roles: ${mapping.roles.join(', ')}`);
  }

  // Specialization check
  if (mapping.specializations) {
    const hasSpec = mapping.specializations.some(s => soulSig.specializations.includes(s));
    if (!hasSpec) {
      failures.push(`Missing required specialization: ${mapping.specializations.join(' or ')}`);
    }
  }

  return {
    passed: failures.length === 0,
    failures,
    reason: failures.length === 0 ? 'All permission gates passed' : failures.join('; '),
  };
}

// ─── Status Gate ───
function checkStatusGate(soulSig) {
  if (soulSig.status === 'suspended') {
    return { passed: false, reason: 'Agent is suspended — no actions permitted' };
  }
  if (soulSig.status === 'probation') {
    return { passed: true, restricted: true, reason: 'Agent on probation — actions logged with elevated scrutiny' };
  }
  if (soulSig.status === 'dormant') {
    return { passed: false, reason: 'Agent is dormant — must reactivate before acting' };
  }
  return { passed: true, reason: 'Active status — nominal' };
}

// ─── Composite Verification ───
function computeVerdict(purposeAlignment, permissionGate, statusGate, soulSig) {
  // Absolute blockers
  if (!statusGate.passed) {
    return { approved: false, verdict: 'BLOCKED', reason: statusGate.reason, confidence: 100 };
  }
  if (!permissionGate.passed) {
    return { approved: false, verdict: 'DENIED', reason: permissionGate.reason, confidence: 95 };
  }

  // Warning-level: low purpose alignment but permissions OK
  if (purposeAlignment.score < 40) {
    return {
      approved: false,
      verdict: 'REJECTED',
      reason: `Purpose alignment too low (${purposeAlignment.score}/100). Action does not match Soul Signature.`,
      confidence: 80,
    };
  }

  // Caution: moderate alignment
  if (purposeAlignment.score < 60) {
    return {
      approved: true,
      verdict: 'CAUTION',
      reason: `Action approved with caution — moderate purpose alignment (${purposeAlignment.score}/100).`,
      confidence: 65,
      elevated_logging: true,
    };
  }

  // Clean pass
  return {
    approved: true,
    verdict: 'APPROVED',
    reason: `Soul Signature verified — purpose alignment ${purposeAlignment.score}/100, all gates passed.`,
    confidence: Math.min(95, purposeAlignment.score),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'verify';

    // ─── PROFILE ───
    if (action === 'profile') {
      const { agent_id } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

      const agent = await base44.asServiceRole.entities.Agent.get(agent_id);
      if (!agent) return Response.json({ error: 'Agent not found' }, { status: 404 });

      const soulSig = extractSoulSignature(agent);

      return Response.json({
        agent_id,
        soul_signature: soulSig,
        timestamp: new Date().toISOString(),
      });
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const limit = body.limit || 30;
      const auditRecords = await base44.asServiceRole.entities.Memory.filter(
        { agent_id: SOUL_GATE_AGENT_ID },
        '-created_date',
        limit
      );

      const stats = {
        total: auditRecords.length,
        approved: auditRecords.filter(r => r.content?.includes('APPROVED')).length,
        caution: auditRecords.filter(r => r.content?.includes('CAUTION')).length,
        denied: auditRecords.filter(r => r.content?.includes('DENIED') || r.content?.includes('REJECTED')).length,
        blocked: auditRecords.filter(r => r.content?.includes('BLOCKED')).length,
      };

      return Response.json({
        audit_trail: auditRecords.map(r => ({
          id: r.id,
          content: r.content,
          keywords: r.keywords,
          importance: r.importance,
          created_date: r.created_date,
        })),
        stats,
      });
    }

    // ─── VERIFY ───
    if (action === 'verify') {
      const { agent_id, proposed_action, action_type, action_context } = body;
      if (!agent_id || !proposed_action) {
        return Response.json({ error: 'agent_id and proposed_action required' }, { status: 400 });
      }

      const startTime = Date.now();

      // 1. Fetch agent
      let agent;
      try {
        agent = await base44.asServiceRole.entities.Agent.get(agent_id);
      } catch (e) {
        return Response.json({ approved: false, verdict: 'BLOCKED', reason: 'Agent not found' });
      }

      // 2. Phase 1 dependency: sincerity pre-check via Hydrogeo Gate
      let hydrogeoResult = { granted: true, fallback: true };
      try {
        const gateRes = await base44.asServiceRole.functions.invoke('hydrogeoContextGate', {
          action: 'validate',
          agent_id,
          access_depth: 'basic',
          request_context: { purpose: 'soul_signature_verify', proposed_action },
        });
        hydrogeoResult = gateRes.data || gateRes;
      } catch (e) {
        // If gate is unreachable, proceed with caution but log it
        console.warn('[soulSignatureVerify] Hydrogeo gate unreachable:', e.message);
      }

      if (!hydrogeoResult.granted) {
        // Sincerity failed — block at Phase 1 level
        await base44.asServiceRole.entities.Memory.create({
          agent_id: SOUL_GATE_AGENT_ID,
          type: 'observation',
          content: `🚫 BLOCKED (Phase 1): Soul Signature verification for ${agent.name} blocked by Hydrogeo Gate. Reason: ${hydrogeoResult.reason}`,
          keywords: ['soul_signature', 'phase_2', 'hydrogeo_blocked', 'security'],
          importance: 8,
          related_entity_id: agent_id,
          related_entity_type: 'Agent',
        });

        return Response.json({
          approved: false,
          verdict: 'BLOCKED',
          reason: `Hydrogeo Gate denied sincerity check: ${hydrogeoResult.reason}`,
          phase_1_gate: hydrogeoResult,
        });
      }

      // 3. Extract Soul Signature
      const soulSig = extractSoulSignature(agent);

      // 4. Run verification gates
      const purposeAlignment = scorePurposeAlignment(soulSig, proposed_action, action_context || '');
      const permissionGate = checkPermissionGate(soulSig, action_type || 'unknown');
      const statusGate = checkStatusGate(soulSig);

      // 5. Compute verdict
      const verdict = computeVerdict(purposeAlignment, permissionGate, statusGate, soulSig);
      const elapsedMs = Date.now() - startTime;

      // 6. Immutable audit log
      const logEmoji = verdict.approved ? (verdict.verdict === 'CAUTION' ? '⚠️' : '✅') : '🚫';
      await base44.asServiceRole.entities.Memory.create({
        agent_id: SOUL_GATE_AGENT_ID,
        type: 'observation',
        content: `${logEmoji} ${verdict.verdict}: ${agent.name} → "${proposed_action}" | Purpose: ${purposeAlignment.score}/100 | Permissions: ${permissionGate.passed ? 'OK' : 'FAIL'} | Status: ${statusGate.passed ? 'OK' : statusGate.reason} | ${elapsedMs}ms`,
        keywords: ['soul_signature', 'phase_2', verdict.verdict.toLowerCase(), action_type || 'unknown'],
        importance: verdict.approved ? (verdict.verdict === 'CAUTION' ? 6 : 3) : 8,
        context: JSON.stringify({
          label: 'Soul Signature Verification',
          agent_id,
          agent_name: agent.name,
          proposed_action,
          action_type,
          verdict: verdict.verdict,
          purpose_score: purposeAlignment.score,
          timestamp: new Date().toISOString(),
        }),
        related_entity_id: agent_id,
        related_entity_type: 'Agent',
      });

      // 7. Create TripwireEvent for denials
      if (!verdict.approved) {
        await base44.asServiceRole.entities.TripwireEvent.create({
          event_type: 'access_violation',
          severity: verdict.verdict === 'BLOCKED' ? 'critical' : 'high',
          status: 'active',
          source_node: 'Soul Signature Gate (Phase 2)',
          source_node_index: 1,
          description: `Soul Signature ${verdict.verdict}: ${agent.name} attempted "${proposed_action}" — ${verdict.reason}`,
          details: {
            agent_id,
            proposed_action,
            action_type,
            purpose_score: purposeAlignment.score,
            permission_failures: permissionGate.failures,
            soul_signature: soulSig,
          },
          actor_email: user.email,
        });
      }

      return Response.json({
        approved: verdict.approved,
        verdict: verdict.verdict,
        reason: verdict.reason,
        confidence: verdict.confidence,
        elevated_logging: verdict.elevated_logging || false,
        soul_signature: {
          name: soulSig.name,
          role: soulSig.role,
          honour: soulSig.honour,
          status: soulSig.status,
          specializations: soulSig.specializations,
        },
        gates: {
          hydrogeo: { passed: hydrogeoResult.granted, fallback: hydrogeoResult.fallback || false },
          purpose_alignment: purposeAlignment,
          permissions: permissionGate,
          status: statusGate,
        },
        processing_ms: elapsedMs,
        timestamp: new Date().toISOString(),
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[soulSignatureVerify]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});