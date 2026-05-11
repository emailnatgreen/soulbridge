/**
 * Phase 6 — Component 1: Tripwire Lesson Extractor
 * 
 * Converts raw tripwire events into structured lessons.
 * Every failure becomes a learning opportunity.
 * 
 * Actions:
 *   - extract:   Parse a tripwire event and create a structured lesson
 *   - scan:      Scan recent unprocessed tripwires and extract lessons in bulk
 *   - audit:     Retrieve lesson extraction history
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LESSON_AGENT_ID = 'REALITY_SKILLS_MONKEY';

// ── Failure type classifier based on tripwire metadata ──────────────────────
function classifyFailure(tripwire) {
  const desc = (tripwire.description || '').toLowerCase();
  const eventType = tripwire.event_type || '';
  const source = (tripwire.source_node || '').toLowerCase();

  if (desc.includes('injection') || desc.includes('prompt') || desc.includes('contamination'))
    return 'injection_attempt';
  if (desc.includes('permission') || desc.includes('access_violation') || eventType === 'access_violation')
    return 'permission_violation';
  if (desc.includes('honour') || desc.includes('honor') || desc.includes('honour_breach'))
    return 'honour_breach';
  if (desc.includes('sincerity') || desc.includes('suspicious'))
    return 'sincerity_failure';
  if (desc.includes('purpose') || desc.includes('misalign'))
    return 'purpose_misalignment';
  if (desc.includes('scope') || desc.includes('overreach') || desc.includes('multi-tab'))
    return 'scope_overreach';
  if (desc.includes('rate') || desc.includes('limit') || eventType === 'rate_limit_exceeded')
    return 'rate_abuse';
  if (desc.includes('protocol') || desc.includes('manifest') || desc.includes('ap2'))
    return 'protocol_violation';
  
  return 'permission_violation'; // default
}

// ── Source gate classifier ──────────────────────────────────────────────────
function classifySourceGate(tripwire) {
  const source = (tripwire.source_node || '').toLowerCase();
  if (source.includes('hydrogeo')) return 'hydrogeo';
  if (source.includes('soul') || source.includes('phase 2')) return 'soul_signature';
  if (source.includes('ap2') || source.includes('phase 5') || source.includes('payment')) return 'ap2_payment';
  if (source.includes('chrome') || source.includes('phase 4') || source.includes('skill')) return 'chrome_skill';
  if (source.includes('attention') || source.includes('node 8') || source.includes('node8')) return 'compressed_attention';
  if (source.includes('sync') || source.includes('phase 3')) return 'node_sync';
  return 'manual';
}

// ── Extract attack pattern signature ────────────────────────────────────────
function extractPattern(tripwire) {
  const details = tripwire.details || {};
  const desc = tripwire.description || '';
  
  // Build a fingerprint from the key identifiers
  const parts = [
    tripwire.event_type,
    classifyFailure(tripwire),
    details.action_type || 'unknown_action',
  ];
  
  // Extract any specific patterns mentioned
  if (details.flags) parts.push(`flags:${details.flags.length}`);
  if (details.purpose_score !== undefined) parts.push(`purpose:${details.purpose_score}`);
  if (details.permission_failures?.length) parts.push(`perms:${details.permission_failures.join(',')}`);
  
  return parts.filter(Boolean).join('::');
}

// ── Generate human-readable lesson ──────────────────────────────────────────
function generateLesson(tripwire, failureType) {
  const desc = tripwire.description || 'Unknown tripwire event';
  const severity = tripwire.severity || 'medium';
  const details = tripwire.details || {};

  const what = `A ${severity}-severity ${failureType.replace(/_/g, ' ')} was detected`;
  const where = `at ${classifySourceGate(tripwire).replace(/_/g, ' ')} gate`;
  
  let why = 'Cause unknown';
  if (failureType === 'injection_attempt') why = 'Prompt injection or instruction override patterns detected in input';
  else if (failureType === 'permission_violation') why = `Agent attempted action outside permitted scope`;
  else if (failureType === 'honour_breach') why = 'Agent honour score fell below required threshold';
  else if (failureType === 'sincerity_failure') why = 'Behavioural patterns indicated manipulative or insincere intent';
  else if (failureType === 'purpose_misalignment') why = 'Proposed action did not align with agent stated purpose';
  else if (failureType === 'scope_overreach') why = 'Agent requested permissions or capabilities beyond authorised scope';
  else if (failureType === 'rate_abuse') why = 'Rate limits or spending limits exceeded';
  else if (failureType === 'protocol_violation') why = 'Required protocol standards (AP2, WebMCP, etc.) not met';

  let prevention = 'Increase monitoring and tighten gate thresholds for this pattern';
  if (failureType === 'injection_attempt') prevention = 'Block pattern signature, add to Shadow Sieve, reduce agent honour';
  else if (failureType === 'honour_breach') prevention = 'Apply honour cooldown, require re-verification before next action';
  else if (failureType === 'sincerity_failure') prevention = 'Add behavioural pattern to watchlist, apply temporary activity restriction';

  return `${what} ${where}. ${why}. Prevention: ${prevention}. Original: ${desc.substring(0, 200)}`;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    if (action === 'extract') {
      return await handleExtract(base44, body);
    }
    if (action === 'scan') {
      return await handleScan(base44, body);
    }
    if (action === 'audit') {
      return await handleAudit(base44, body);
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[TripwireLessonEngine]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});


// ── Extract a single lesson from a tripwire event ───────────────────────────
async function handleExtract(base44, body) {
  const { tripwire_event_id } = body;
  if (!tripwire_event_id) return Response.json({ error: 'tripwire_event_id required' }, { status: 400 });

  let tripwire;
  try {
    tripwire = await base44.asServiceRole.entities.TripwireEvent.get(tripwire_event_id);
  } catch (e) {
    return Response.json({ error: 'Tripwire event not found' }, { status: 404 });
  }

  // Check if lesson already exists for this tripwire
  const existing = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { tripwire_event_id }, '-created_date', 1
  );
  if (existing?.length) {
    return Response.json({ already_extracted: true, lesson: existing[0] });
  }

  const lesson = await extractAndStoreLessson(base44, tripwire);
  return Response.json({ success: true, lesson });
}


// ── Scan recent tripwires and extract lessons in bulk ───────────────────────
async function handleScan(base44, body) {
  const limit = Math.min(body.limit || 20, 50);
  
  // Get recent active/acknowledged tripwires
  const tripwires = await base44.asServiceRole.entities.TripwireEvent.filter(
    {}, '-created_date', limit
  );

  // Get existing lessons to avoid duplicates
  const existingLessons = await base44.asServiceRole.entities.EvolutionaryMemory.list('-created_date', 200);
  const processedTripwireIds = new Set(existingLessons.map(l => l.tripwire_event_id));

  const newLessons = [];
  for (const tripwire of (tripwires || [])) {
    if (processedTripwireIds.has(tripwire.id)) continue;
    
    const lesson = await extractAndStoreLessson(base44, tripwire);
    newLessons.push(lesson);
  }

  return Response.json({
    success: true,
    scanned: tripwires?.length || 0,
    already_processed: processedTripwireIds.size,
    new_lessons: newLessons.length,
    lessons: newLessons,
  });
}


// ── Audit: retrieve lesson history ──────────────────────────────────────────
async function handleAudit(base44, body) {
  const limit = Math.min(body.limit || 50, 200);
  const lessons = await base44.asServiceRole.entities.EvolutionaryMemory.list('-created_date', limit);

  const stats = {
    total: lessons.length,
    pending: 0, applied: 0, consensus: 0, rejected: 0,
    by_failure: {},
    by_gate: {},
    avg_effectiveness: 0,
  };

  let effectivenessSum = 0;
  for (const l of lessons) {
    if (stats[l.status] !== undefined) stats[l.status]++;
    stats.by_failure[l.failure_type] = (stats.by_failure[l.failure_type] || 0) + 1;
    stats.by_gate[l.source_gate] = (stats.by_gate[l.source_gate] || 0) + 1;
    effectivenessSum += l.effectiveness_score || 0;
  }
  stats.avg_effectiveness = lessons.length > 0 ? Math.round(effectivenessSum / lessons.length) : 0;

  return Response.json({ stats, lessons });
}


// ── Core: extract lesson from tripwire and store ────────────────────────────
async function extractAndStoreLessson(base44, tripwire) {
  const failureType = classifyFailure(tripwire);
  const sourceGate = classifySourceGate(tripwire);
  const pattern = extractPattern(tripwire);
  const summary = generateLesson(tripwire, failureType);
  const lessonId = `LESSON-${Date.now().toString(36).toUpperCase()}`;

  // Check how many times this pattern has been seen
  const similarLessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { attack_pattern: pattern }, '-created_date', 50
  );
  const timesSeen = (similarLessons?.length || 0) + 1;

  // Determine agent from tripwire details
  const agentId = tripwire.details?.agent_id || tripwire.affected_entity_id || null;
  let agentName = 'Unknown';
  if (agentId) {
    try {
      const agent = await base44.asServiceRole.entities.Agent.get(agentId);
      agentName = agent.name;
    } catch (e) { /* non-critical */ }
  }

  const lesson = await base44.asServiceRole.entities.EvolutionaryMemory.create({
    lesson_id: lessonId,
    tripwire_event_id: tripwire.id,
    agent_id: agentId,
    agent_name: agentName,
    source_gate: sourceGate,
    failure_type: failureType,
    severity: tripwire.severity || 'medium',
    lesson_summary: summary,
    attack_pattern: pattern,
    times_pattern_seen: timesSeen,
    status: 'pending',
    tripwire_details: {
      event_type: tripwire.event_type,
      source_node: tripwire.source_node,
      description: (tripwire.description || '').substring(0, 500),
      created_date: tripwire.created_date,
    },
  });

  // Log to Memory for audit trail
  await base44.asServiceRole.entities.Memory.create({
    agent_id: LESSON_AGENT_ID,
    type: 'observation',
    content: `🐒 LESSON EXTRACTED: ${lessonId} | ${failureType} | ${sourceGate} | Severity: ${tripwire.severity} | Pattern seen ${timesSeen}x | Agent: ${agentName}`,
    keywords: ['reality_skills', 'phase_6', 'lesson_extracted', failureType, sourceGate],
    importance: tripwire.severity === 'critical' ? 8 : tripwire.severity === 'high' ? 6 : 4,
    related_entity_id: lesson.id,
    related_entity_type: 'EvolutionaryMemory',
  });

  return lesson;
}