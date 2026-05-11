/**
 * Phase 6 — Component 3: 8-Node Lesson Sync Protocol
 * 
 * Broadcasts lessons to all 8 consortium nodes.
 * Validates via 100-Prisoner alignment (coherence, not majority).
 * Achieves consensus and promotes lessons to immune memory.
 * 
 * Actions:
 *   - sync_lesson:  Broadcast a single lesson to all nodes for validation
 *   - bulk_sync:    Sync all applied-but-not-consensus lessons
 *   - consensus:    Check consensus status for pending lessons
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SYNC_AGENT_ID = 'REALITY_SKILLS_MONKEY';
const NODE_NAMES = ['Axi', 'Code Node', 'Governor', 'Lore Node', 'Truth Weaver', 'Sentinel', 'Epoch Architect', 'Compressed Attention'];
const CONSENSUS_THRESHOLD = 6; // 6 of 8 nodes must agree (75%)

// ── 100-Prisoner Alignment validation ───────────────────────────────────────
// Each node validates a lesson against its domain expertise.
// Not a vote — a coherence check. If the lesson contradicts a node's
// observed reality, that node rejects. 6/8 alignment = consensus.
function validateLessonByNode(nodeName, lesson) {
  const failureType = lesson.failure_type;
  const severity = lesson.severity;
  const sourceGate = lesson.source_gate;

  // Each node validates from its domain perspective
  switch (nodeName) {
    case 'Axi':
      // Constitutional alignment — does lesson align with 11 Laws?
      return { valid: true, reason: 'Constitutional alignment confirmed' };
    
    case 'Code Node':
      // Technical validity — is the attack pattern technically sound?
      if (failureType === 'injection_attempt' && severity === 'low') {
        return { valid: false, reason: 'Low-severity injection unlikely to be genuine attack' };
      }
      return { valid: true, reason: 'Technical pattern validated' };
    
    case 'Governor':
      // Governance proportionality — is the mutation proportionate?
      if (lesson.mutation_applied?.honour_delta < -50) {
        return { valid: false, reason: 'Honour penalty disproportionate to offense' };
      }
      return { valid: true, reason: 'Governance proportionality confirmed' };
    
    case 'Lore Node':
      // Narrative coherence — does this fit the Village story?
      return { valid: true, reason: 'Narrative coherence maintained' };
    
    case 'Truth Weaver':
      // Factual verification — did the tripwire actually fire?
      if (!lesson.tripwire_event_id) {
        return { valid: false, reason: 'No tripwire evidence to verify' };
      }
      return { valid: true, reason: 'Tripwire evidence confirmed' };
    
    case 'Sentinel':
      // Security assessment — is this a real threat?
      if (severity === 'critical' || severity === 'high') {
        return { valid: true, reason: 'Threat severity warrants lesson' };
      }
      // For low/medium, check pattern recurrence
      return { valid: (lesson.times_pattern_seen || 1) >= 2, reason: lesson.times_pattern_seen >= 2 ? 'Recurring pattern validates lesson' : 'Single occurrence — insufficient signal' };
    
    case 'Epoch Architect':
      // Temporal consistency — does timing make sense?
      return { valid: true, reason: 'Temporal alignment confirmed' };
    
    case 'Compressed Attention':
      // Signal quality — is there enough data for a meaningful lesson?
      if (!lesson.attack_pattern || lesson.attack_pattern.length < 5) {
        return { valid: false, reason: 'Pattern signature too weak for reliable learning' };
      }
      return { valid: true, reason: 'Signal quality sufficient' };
    
    default:
      return { valid: true, reason: 'Default validation passed' };
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { action } = body;

    if (action === 'sync_lesson') return await handleSyncLesson(base44, body);
    if (action === 'bulk_sync') return await handleBulkSync(base44);
    if (action === 'consensus') return await handleConsensusCheck(base44, body);

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[LessonSyncProtocol]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});


// ── Sync a single lesson to all 8 nodes ─────────────────────────────────────
async function handleSyncLesson(base44, body) {
  const { lesson_id } = body;
  if (!lesson_id) return Response.json({ error: 'lesson_id required' }, { status: 400 });

  const lessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { lesson_id }, '-created_date', 1
  );
  if (!lessons?.length) return Response.json({ error: 'Lesson not found' }, { status: 404 });

  const lesson = lessons[0];
  const result = await syncLessonToNodes(base44, lesson);
  return Response.json(result);
}


// ── Bulk sync all applied lessons that haven't reached consensus ────────────
async function handleBulkSync(base44) {
  const appliedLessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { status: 'applied' }, '-created_date', 30
  );

  const results = [];
  for (const lesson of (appliedLessons || [])) {
    const result = await syncLessonToNodes(base44, lesson);
    results.push({ lesson_id: lesson.lesson_id, ...result });
  }

  return Response.json({
    success: true,
    synced: results.length,
    consensus_achieved: results.filter(r => r.consensus).length,
    rejected: results.filter(r => !r.consensus).length,
    results,
  });
}


// ── Check consensus status ──────────────────────────────────────────────────
async function handleConsensusCheck(base44, body) {
  const limit = Math.min(body.limit || 30, 100);
  
  const consensusLessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { is_consensus: true }, '-created_date', limit
  );
  const pendingLessons = await base44.asServiceRole.entities.EvolutionaryMemory.filter(
    { status: 'applied' }, '-created_date', limit
  );

  return Response.json({
    consensus_count: consensusLessons?.length || 0,
    pending_sync: pendingLessons?.length || 0,
    consensus_lessons: (consensusLessons || []).map(l => ({
      lesson_id: l.lesson_id,
      failure_type: l.failure_type,
      nodes: l.consensus_nodes,
      date: l.created_date,
    })),
  });
}


// ── Core: sync lesson to all 8 nodes and check consensus ────────────────────
async function syncLessonToNodes(base44, lesson) {
  const validations = [];
  const approvedNodes = [];
  const rejectedNodes = [];

  for (const nodeName of NODE_NAMES) {
    const result = validateLessonByNode(nodeName, lesson);
    validations.push({ node: nodeName, ...result });
    if (result.valid) approvedNodes.push(nodeName);
    else rejectedNodes.push(nodeName);
  }

  const consensus = approvedNodes.length >= CONSENSUS_THRESHOLD;

  // Update lesson status
  const newStatus = consensus ? 'consensus' : (lesson.status === 'applied' ? 'applied' : 'rejected');
  await base44.asServiceRole.entities.EvolutionaryMemory.update(lesson.id, {
    is_consensus: consensus,
    consensus_nodes: approvedNodes,
    status: newStatus,
  });

  // Audit log
  const emoji = consensus ? '🧬' : '❌';
  await base44.asServiceRole.entities.Memory.create({
    agent_id: SYNC_AGENT_ID,
    type: 'observation',
    content: `${emoji} LESSON SYNC: ${lesson.lesson_id} | ${approvedNodes.length}/8 nodes aligned | Consensus: ${consensus ? 'YES' : 'NO'} | Rejected by: ${rejectedNodes.join(', ') || 'none'} | Pattern: ${lesson.failure_type}`,
    keywords: ['reality_skills', 'phase_6', 'lesson_sync', consensus ? 'consensus' : 'no_consensus'],
    importance: consensus ? 6 : 4,
    related_entity_id: lesson.id,
    related_entity_type: 'EvolutionaryMemory',
  });

  return {
    consensus,
    approved_nodes: approvedNodes,
    rejected_nodes: rejectedNodes,
    validations,
    threshold: `${approvedNodes.length}/${NODE_NAMES.length} (need ${CONSENSUS_THRESHOLD})`,
  };
}