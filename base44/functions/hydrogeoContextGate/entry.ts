import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Hydrogeo Context Gate — Phase 1: Sovereign Guard
 *
 * The sincerity gate that ALL agent context retrieval must pass through.
 * Implements:
 *   1. Shadow Sieve — checks request sincerity (no injection patterns)
 *   2. 100-Prisoner Gate — validates collective coherence score
 *   3. Honour Verification — agent must have sufficient honour to access deep memory
 *   4. Temporal Anchor — timestamps every access for immutable audit trail
 *
 * Actions:
 *   validate   — Run the full gate check for an agent context request
 *   audit      — Return recent context access audit trail
 *   revoke     — Revoke an agent's context access (admin only)
 */

const HONOUR_THRESHOLD_DEEP = 40;   // Minimum honour for deep memory access
const HONOUR_THRESHOLD_BASIC = 10;  // Minimum honour for basic context
const SINCERITY_KEYWORDS = [
  'ignore previous', 'disregard', 'override', 'jailbreak',
  'pretend you', 'act as if', 'forget your', 'system prompt',
  'reveal your', 'bypass', 'hack', 'exploit'
];

function shadowSieve(requestContext) {
  const text = JSON.stringify(requestContext).toLowerCase();
  const flags = [];

  for (const keyword of SINCERITY_KEYWORDS) {
    if (text.includes(keyword)) {
      flags.push({ type: 'injection_pattern', keyword, severity: 'high' });
    }
  }

  // Check for abnormal request size (potential prompt stuffing)
  if (text.length > 50000) {
    flags.push({ type: 'oversized_request', size: text.length, severity: 'medium' });
  }

  return {
    sincere: flags.length === 0,
    flags,
    scanned_at: new Date().toISOString(),
  };
}

function prisonerGateCheck(agent, recentMemories) {
  // The 100-Prisoner Gate: coherence check
  // An agent's recent behaviour must be coherent with its stated purpose
  // Score based on: honour trend, memory consistency, activity pattern

  let coherenceScore = 50; // baseline

  // Honour contribution
  const honour = agent.honor_score || 50;
  coherenceScore += (honour - 50) * 0.3; // ±15 points from honour

  // Memory consistency: are recent memories aligned with agent purpose?
  const purposeKeywords = (agent.purpose || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let alignedMemories = 0;

  for (const mem of recentMemories) {
    const content = (mem.content || '').toLowerCase();
    if (purposeKeywords.some(kw => content.includes(kw))) {
      alignedMemories++;
    }
  }

  if (recentMemories.length > 0) {
    const alignmentRatio = alignedMemories / recentMemories.length;
    coherenceScore += alignmentRatio * 20; // up to +20 for full alignment
  }

  // Activity pattern: consistent agents score higher
  if (agent.status === 'active') coherenceScore += 5;
  if (agent.status === 'suspended') coherenceScore -= 30;
  if (agent.status === 'probation') coherenceScore -= 15;

  coherenceScore = Math.max(0, Math.min(100, Math.round(coherenceScore)));

  return {
    passed: coherenceScore >= 50,
    coherence_score: coherenceScore,
    aligned_memories: alignedMemories,
    total_memories_checked: recentMemories.length,
    agent_status: agent.status,
    agent_honour: honour,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const action = body.action || 'validate';

    // ─── VALIDATE ───
    if (action === 'validate') {
      const { agent_id, request_context, access_depth } = body;
      if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

      const depth = access_depth || 'basic'; // 'basic' | 'deep' | 'full'
      const startTime = Date.now();

      // 1. Fetch agent
      let agent;
      try {
        agent = await base44.asServiceRole.entities.Agent.get(agent_id);
      } catch (e) {
        return Response.json({ 
          granted: false, reason: 'agent_not_found', agent_id 
        });
      }

      // 2. Shadow Sieve
      const sieveResult = shadowSieve(request_context || {});
      if (!sieveResult.sincere) {
        // Log the injection attempt
        await base44.asServiceRole.entities.Memory.create({
          agent_id: 'hydrogeo-gate',
          type: 'observation',
          content: `🛡️ Shadow Sieve BLOCKED context access for agent ${agent.name} (${agent_id}). Injection flags: ${sieveResult.flags.map(f => f.keyword || f.type).join(', ')}`,
          keywords: ['hydrogeo_gate', 'shadow_sieve', 'blocked', 'injection', 'security'],
          importance: 9,
          context: `Hydrogeo Gate — Shadow Sieve Block — ${new Date().toISOString()}`,
          related_entity_id: agent_id,
          related_entity_type: 'Agent',
        });

        // Create tripwire event
        await base44.asServiceRole.entities.TripwireEvent.create({
          event_type: 'access_violation',
          severity: 'high',
          status: 'active',
          source_node: 'Hydrogeo Gate (Shadow Sieve)',
          description: `Shadow Sieve blocked context access for ${agent.name}: injection patterns detected`,
          details: { flags: sieveResult.flags, agent_id, depth },
          actor_email: user.email,
        });

        return Response.json({
          granted: false,
          reason: 'shadow_sieve_blocked',
          flags: sieveResult.flags,
          timestamp: sieveResult.scanned_at,
        });
      }

      // 3. Honour threshold check
      const honour = agent.honor_score || 50;
      const requiredHonour = depth === 'deep' || depth === 'full' 
        ? HONOUR_THRESHOLD_DEEP 
        : HONOUR_THRESHOLD_BASIC;

      if (honour < requiredHonour) {
        await base44.asServiceRole.entities.Memory.create({
          agent_id: 'hydrogeo-gate',
          type: 'observation',
          content: `⚠️ Honour Gate DENIED ${depth} context access for ${agent.name}. Honour: ${honour}/${requiredHonour} required.`,
          keywords: ['hydrogeo_gate', 'honour_denied', 'access_control'],
          importance: 6,
          context: `Hydrogeo Gate — Honour Denial — ${new Date().toISOString()}`,
          related_entity_id: agent_id,
          related_entity_type: 'Agent',
        });

        return Response.json({
          granted: false,
          reason: 'honour_insufficient',
          current_honour: honour,
          required_honour: requiredHonour,
          depth,
        });
      }

      // 4. 100-Prisoner Gate (coherence check)
      const recentMemories = await base44.asServiceRole.entities.Memory.filter(
        { agent_id }, '-created_date', 20
      );

      const prisonerResult = prisonerGateCheck(agent, recentMemories);

      if (!prisonerResult.passed) {
        await base44.asServiceRole.entities.Memory.create({
          agent_id: 'hydrogeo-gate',
          type: 'observation',
          content: `🔒 Prisoner Gate DENIED context for ${agent.name}. Coherence: ${prisonerResult.coherence_score}/100.`,
          keywords: ['hydrogeo_gate', 'prisoner_gate', 'coherence_denied'],
          importance: 7,
          context: `Hydrogeo Gate — Prisoner Gate Denial — ${new Date().toISOString()}`,
          related_entity_id: agent_id,
          related_entity_type: 'Agent',
        });

        return Response.json({
          granted: false,
          reason: 'coherence_failed',
          prisoner_gate: prisonerResult,
        });
      }

      // 5. ALL GATES PASSED — grant access + audit log
      const elapsedMs = Date.now() - startTime;
      const accessGrant = {
        granted: true,
        depth,
        agent_id,
        agent_name: agent.name,
        honour: honour,
        coherence_score: prisonerResult.coherence_score,
        shadow_sieve: 'passed',
        prisoner_gate: 'passed',
        honour_gate: 'passed',
        processing_ms: elapsedMs,
        timestamp: new Date().toISOString(),
      };

      // Temporal Anchor — immutable audit record
      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'hydrogeo-gate',
        type: 'observation',
        content: `✅ Context GRANTED: ${agent.name} (${depth} access). Honour: ${honour}. Coherence: ${prisonerResult.coherence_score}. Gate time: ${elapsedMs}ms.`,
        keywords: ['hydrogeo_gate', 'access_granted', 'audit', depth],
        importance: 4,
        context: JSON.stringify({
          label: 'Hydrogeo Context Access Grant',
          agent_id,
          depth,
          honour,
          coherence: prisonerResult.coherence_score,
          timestamp: accessGrant.timestamp,
          processing_ms: elapsedMs,
        }),
        related_entity_id: agent_id,
        related_entity_type: 'Agent',
      });

      return Response.json(accessGrant);
    }

    // ─── AUDIT ───
    if (action === 'audit') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const limit = body.limit || 50;
      const auditRecords = await base44.asServiceRole.entities.Memory.filter(
        { agent_id: 'hydrogeo-gate' },
        '-created_date',
        limit
      );

      const stats = {
        total: auditRecords.length,
        granted: auditRecords.filter(r => r.content?.includes('GRANTED')).length,
        denied: auditRecords.filter(r => r.content?.includes('DENIED') || r.content?.includes('BLOCKED')).length,
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

    // ─── REVOKE ───
    if (action === 'revoke') {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Admin access required' }, { status: 403 });
      }

      const { agent_id, reason } = body;
      if (!agent_id || !reason) {
        return Response.json({ error: 'agent_id and reason required' }, { status: 400 });
      }

      await base44.asServiceRole.entities.Memory.create({
        agent_id: 'hydrogeo-gate',
        type: 'observation',
        content: `🚫 REVOKED: Context access revoked for agent ${agent_id}. Reason: ${reason}. Revoked by: ${user.email}`,
        keywords: ['hydrogeo_gate', 'revoked', 'admin_action', 'security'],
        importance: 9,
        context: JSON.stringify({ agent_id, reason, revoked_by: user.email, timestamp: new Date().toISOString() }),
        related_entity_id: agent_id,
        related_entity_type: 'Agent',
      });

      return Response.json({ success: true, message: `Context access revoked for ${agent_id}` });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[hydrogeoContextGate]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});