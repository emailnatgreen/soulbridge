/**
 * Phase 6 — Component 2: Agent Mutation Engine
 * 
 * Applies evolutionary mutations to agents based on lessons learned.
 * Honour adjustments, permission refinements, vigilance patterns.
 * 
 * Actions:
 *   - mutate:     Apply mutation from a lesson to an agent
 *   - bulk_mutate: Process all pending lessons and apply mutations
 *   - history:    Get mutation history for an agent
 *   - effectiveness: Score how well a past mutation prevented recurrence
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MUTATION_AGENT_ID = 'REALITY_SKILLS_MONKEY';

// ── Mutation calculation based on failure type and severity ──────────────────
function calculateMutation(lesson) {
  const { failure_type, severity, times_pattern_seen } = lesson;

  const mutation = {
    honour_delta: 0,
    permissions_narrowed: [],
    vigilance_patterns: [],
    cooldown_applied_hours: 0,
  };

  // Severity multiplier
  const severityMultiplier = { low: 0.5, medium: 1, high: 1.5, critical: 2.5 }[severity] || 1;
  
  // Recurrence multiplier — repeated offenses are punished harder
  const recurrenceMultiplier = Math.min(times_pattern_seen || 1, 5);

  // Honour delta — always negative for failures
  const baseHonourPenalty = {
    injection_attempt: -8,
    permission_violation: -5,
    honour_breach: -3,
    sincerity_failure: -10,
    purpose_misalignment: -4,
    scope_overreach: -6,
    rate_abuse: -2,
    protocol_violation: -5,
  }[failure_type] || -3;

  mutation.honour_delta = Math.round(baseHonourPenalty * severityMultiplier * Math.sqrt(recurrenceMultiplier));

  // Permission narrowing
  if (failure_type === 'permission_violation' || failure_type === 'scope_overreach') {
    mutation.permissions_narrowed.push('can_create_agents');
    if (severity === 'critical') mutation.permissions_narrowed.push('can_access_treasury');
  }
  if (failure_type === 'sincerity_failure' || failure_type === 'injection_attempt') {
    mutation.permissions_narrowed.push('can_send_xrp');
    if (recurrenceMultiplier >= 3) mutation.permissions_narrowed.push('can_vote');
  }

  // Vigilance patterns
  if (lesson.attack_pattern) {
    mutation.vigilance_patterns.push(lesson.attack_pattern);
  }

  // Cooldown — restrict activity
  if (severity === 'critical') mutation.cooldown_applied_hours = 24 * recurrenceMultiplier;
  else if (severity === 'high') mutation.cooldown_applied_hours = 6 * recurrenceMultiplier;
  else if (failure_type === 'sincerity_failure') mutation.cooldown_applied_hours = 12;

  return mutation;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    if (action === 'mutate') return await handleMutate(base44, body);
    if (action === 'bulk_mutate') return await handleBulkMutate(base44);
    if (action === 'history') return await handleHistory(base44, body);
    if (action === 'effectiveness') return await handleEffectiveness(base44, body);

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[AgentMutationEngine]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});


// ── Apply mutation from a lesson ────────────────────────────────────────────
async function handleMutate(base44, body) {
  const { lesson_id } = body;
  if (!lesson_id) return Response.json({ error: 'lesson_id required' }, { status: 400 });

  const lessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { lesson_id }, '-created_date', 1
  );
  if (!lessons?.length) return Response.json({ error: 'Lesson not found' }, { status: 404 });

  const lesson = lessons[0];
  if (lesson.status === 'applied' || lesson.status === 'consensus') {
    return Response.json({ already_applied: true, lesson });
  }

  const result = await applyMutation(base44, lesson);
  return Response.json(result);
}


// ── Process all pending lessons ─────────────────────────────────────────────
async function handleBulkMutate(base44) {
  const pendingLessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { status: 'pending' }, '-created_date', 30
  );

  const results = [];
  for (const lesson of (pendingLessons || [])) {
    if (!lesson.agent_id) {
      // No agent to mutate — mark as applied anyway (system-level lesson)
      await base44.asServiceRole.entities.EvolutionaryMemory.update(lesson.id, {
        status: 'applied',
        mutation_applied: { honour_delta: 0, permissions_narrowed: [], vigilance_patterns: [lesson.attack_pattern || ''], cooldown_applied_hours: 0 },
      });
      results.push({ lesson_id: lesson.lesson_id, status: 'applied_system_level', agent: null });
      continue;
    }
    const result = await applyMutation(base44, lesson);
    results.push(result);
  }

  return Response.json({
    success: true,
    processed: results.length,
    results,
  });
}


// ── Get mutation history for an agent ───────────────────────────────────────
async function handleHistory(base44, body) {
  const { agent_id } = body;
  if (!agent_id) return Response.json({ error: 'agent_id required' }, { status: 400 });

  const lessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { agent_id }, '-created_date', 50
  );

  // Compute agent immune score
  const total = lessons.length;
  const effective = lessons.filter(l => (l.effectiveness_score || 0) > 50).length;
  const immuneScore = total > 0 ? Math.round((effective / total) * 100) : 100;

  return Response.json({
    agent_id,
    total_lessons: total,
    effective_lessons: effective,
    immune_score: immuneScore,
    lessons: lessons.map(l => ({
      lesson_id: l.lesson_id,
      failure_type: l.failure_type,
      severity: l.severity,
      mutation_applied: l.mutation_applied,
      effectiveness_score: l.effectiveness_score,
      status: l.status,
      date: l.created_date,
    })),
  });
}


// ── Score effectiveness of a past mutation ───────────────────────────────────
async function handleEffectiveness(base44, body) {
  const { lesson_id } = body;
  if (!lesson_id) return Response.json({ error: 'lesson_id required' }, { status: 400 });

  const lessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { lesson_id }, '-created_date', 1
  );
  if (!lessons?.length) return Response.json({ error: 'Lesson not found' }, { status: 404 });

  const lesson = lessons[0];
  if (!lesson.attack_pattern || !lesson.agent_id) {
    return Response.json({ effectiveness_score: 50, reason: 'Insufficient data to score' });
  }

  // Check if the same pattern recurred for this agent after the mutation
  const laterLessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { agent_id: lesson.agent_id, attack_pattern: lesson.attack_pattern }, '-created_date', 10
  );

  const recurrences = laterLessons.filter(l => 
    new Date(l.created_date) > new Date(lesson.created_date)
  ).length;

  // Effectiveness: 100 if no recurrence, decreases with each repeat
  const score = Math.max(0, 100 - (recurrences * 25));

  // Update the lesson's effectiveness
  await base44.asServiceRole.entities.EvolutionaryMemory.update(lesson.id, {
    effectiveness_score: score,
  });

  return Response.json({
    lesson_id,
    effectiveness_score: score,
    recurrences_after_mutation: recurrences,
    verdict: score >= 75 ? 'EFFECTIVE' : score >= 50 ? 'PARTIAL' : 'INEFFECTIVE',
  });
}


// ── Core: apply mutation to agent ───────────────────────────────────────────
async function applyMutation(base44, lesson) {
  const mutation = calculateMutation(lesson);

  let agentUpdated = false;
  let agentBefore = null;

  if (lesson.agent_id) {
    try {
      const agent = await base44.asServiceRole.entities.Agent.get(lesson.agent_id);
      agentBefore = { honour: agent.honor_score, permissions: { ...agent.permissions } };

      // Apply honour delta (never below 0)
      const newHonour = Math.max(0, (agent.honor_score || 0) + mutation.honour_delta);

      // Apply permission narrowing
      const updatedPermissions = { ...(agent.permissions || {}) };
      for (const perm of mutation.permissions_narrowed) {
        if (updatedPermissions[perm] !== undefined) {
          updatedPermissions[perm] = false;
        }
      }

      // Update agent
      await base44.asServiceRole.entities.Agent.update(lesson.agent_id, {
        honor_score: newHonour,
        permissions: updatedPermissions,
      });

      agentUpdated = true;
    } catch (e) {
      console.warn('[AgentMutationEngine] Agent update failed:', e.message);
    }
  }

  // Update lesson status
  await base44.asServiceRole.entities.EvolutionaryMemory.update(lesson.id, {
    status: 'applied',
    mutation_applied: mutation,
  });

  // Audit log
  const emoji = mutation.honour_delta < -10 ? '🔴' : mutation.honour_delta < -5 ? '🟠' : '🟡';
  await base44.asServiceRole.entities.Memory.create({
    agent_id: MUTATION_AGENT_ID,
    type: 'observation',
    content: `${emoji} MUTATION APPLIED: ${lesson.lesson_id} → ${lesson.agent_name || 'System'} | Honour: ${mutation.honour_delta} | Perms narrowed: ${mutation.permissions_narrowed.join(', ') || 'none'} | Cooldown: ${mutation.cooldown_applied_hours}h | Pattern: ${lesson.failure_type}`,
    keywords: ['reality_skills', 'phase_6', 'mutation_applied', lesson.failure_type],
    importance: Math.abs(mutation.honour_delta) > 10 ? 8 : 5,
    related_entity_id: lesson.id,
    related_entity_type: 'EvolutionaryMemory',
  });

  return {
    success: true,
    lesson_id: lesson.lesson_id,
    agent_id: lesson.agent_id,
    agent_name: lesson.agent_name,
    mutation,
    agent_before: agentBefore,
    agent_updated: agentUpdated,
  };
}