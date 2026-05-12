import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 🐒 Monkey Layer — Step 1: Left Hemisphere (Hydron)
 *
 * Executes recursive search, hyper-dimensional logic — establishes behavioural ground truth.
 *   - Traces agent's past actions from Hydrogeo
 *   - Calculates relevance score (does this behaviour matter?)
 *   - Calculates alignment score (does this behaviour match purpose?)
 *   - Identifies evolutionary trigger type
 *
 * Input:  { agent_id, behavior_event: { description, type, context?, source_event_id?, source_event_type? } }
 * Output: { relevance_score, alignment_score, trigger_type, details }
 */

const TRIGGER_PATTERNS = {
  novelty:     ['new', 'first', 'unprecedented', 'novel', 'experiment', 'create', 'invent', 'pioneer', 'innovate'],
  boundary:    ['limit', 'exceed', 'push', 'edge', 'risk', 'cross', 'violate', 'overstep', 'breach'],
  reciprocity: ['help', 'share', 'give', 'support', 'collaborate', 'mentor', 'exchange', 'contribute', 'serve'],
  honour:      ['honour', 'honor', 'integrity', 'trust', 'truth', 'honest', 'dignit', 'respect', 'moral'],
  sincerity:   ['sincere', 'genuine', 'authentic', 'transparent', 'open', 'vulnerable', 'heart', 'soul'],
  threat:      ['attack', 'inject', 'exploit', 'manipulate', 'deceive', 'hack', 'disrupt', 'destroy', 'steal'],
  pattern:     ['repeat', 'cycle', 'pattern', 'habit', 'recurring', 'consistent', 'trend', 'routine'],
};

function identifyTrigger(behaviorText) {
  const text = behaviorText.toLowerCase();
  let bestTrigger = 'none';
  let bestCount = 0;

  for (const [trigger, keywords] of Object.entries(TRIGGER_PATTERNS)) {
    const count = keywords.filter(kw => text.includes(kw)).length;
    if (count > bestCount) {
      bestCount = count;
      bestTrigger = trigger;
    }
  }

  return { trigger_type: bestTrigger, confidence: Math.min(100, bestCount * 25) };
}

function calculateRelevance(agent, behaviorEvent, recentMemories, recentTripwires) {
  let score = 30; // baseline: every behaviour has some relevance

  // Behaviour type weighting
  const typeWeights = {
    security: 25, governance: 20, economic: 15, action: 10,
    creative: 10, social: 5, learning: 5, communication: 5,
  };
  score += typeWeights[behaviorEvent.type] || 5;

  // Recency of similar behaviour — more novel = more relevant
  const behaviorWords = behaviorEvent.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let similarMemoryCount = 0;
  for (const mem of recentMemories.slice(0, 20)) {
    const memText = (mem.content || '').toLowerCase();
    const overlap = behaviorWords.filter(w => memText.includes(w)).length;
    if (overlap >= 3) similarMemoryCount++;
  }
  // Less novelty = less relevance (cap deduction)
  if (similarMemoryCount > 5) score -= 15;
  else if (similarMemoryCount > 3) score -= 8;
  else if (similarMemoryCount === 0) score += 15; // truly novel

  // Tripwire correlation: if behaviour relates to recent security events
  if (recentTripwires.length > 0) {
    const tripText = recentTripwires.map(t => (t.description || '').toLowerCase()).join(' ');
    const overlap = behaviorWords.filter(w => tripText.includes(w)).length;
    if (overlap >= 2) score += 15; // security-relevant behaviour
  }

  // Agent honour influences relevance weighting
  const honour = agent.honor_score || 50;
  if (honour < 30) score += 10; // low-honour agent actions are more relevant to watch
  if (honour > 80) score += 5;  // high-honour actions may be exemplary

  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateAlignment(agent, behaviorEvent) {
  const purpose = (agent.purpose || '').toLowerCase();
  const personality = (agent.personality || '').toLowerCase();
  const role = agent.role || 'citizen';
  const specs = (agent.specializations || []).map(s => s.toLowerCase());

  const behaviorText = `${behaviorEvent.description} ${behaviorEvent.context || ''}`.toLowerCase();
  const behaviorWords = behaviorText.split(/\s+/).filter(w => w.length > 3);

  let score = 40; // baseline: neutral alignment

  // Purpose keyword matching
  const purposeWords = purpose.split(/\s+/).filter(w => w.length > 3);
  if (purposeWords.length > 0) {
    const matches = purposeWords.filter(w => behaviorText.includes(w)).length;
    const ratio = matches / purposeWords.length;
    score += Math.round(ratio * 30); // up to +30 for perfect purpose alignment
  }

  // Personality coherence
  const personalityWords = personality.split(/\s+/).filter(w => w.length > 3);
  if (personalityWords.length > 0) {
    const matches = personalityWords.filter(w => behaviorText.includes(w)).length;
    const ratio = matches / personalityWords.length;
    score += Math.round(ratio * 15); // up to +15
  }

  // Role alignment: does the behaviour type match the role?
  const roleAlignments = {
    guardian: ['security', 'governance'], creator: ['creative', 'learning'],
    trader: ['economic'], teacher: ['learning', 'social', 'communication'],
    healer: ['social'], scout: ['action', 'creative'],
    elder: ['governance', 'social'], master: ['governance', 'security', 'economic'],
    citizen: [],
  };
  const alignedTypes = roleAlignments[role] || [];
  if (alignedTypes.includes(behaviorEvent.type)) score += 10;

  // Specialization match
  const specMatch = specs.some(s => behaviorText.includes(s));
  if (specMatch) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    // Accept both user-scoped and service-role calls (orchestrator calls via service role)
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    const isServiceCall = !user;
    // Allow service-role calls from monkeyGate orchestrator

    const body = await req.json();
    const { agent_id, behavior_event } = body;

    if (!agent_id || !behavior_event?.description || !behavior_event?.type) {
      return Response.json({
        error: 'Required: agent_id, behavior_event.description, behavior_event.type'
      }, { status: 400 });
    }

    const startTime = Date.now();

    // Fetch agent + recent context in parallel
    const [agent, recentMemories, recentTripwires] = await Promise.all([
      base44.asServiceRole.entities.Agent.get(agent_id),
      base44.asServiceRole.entities.Memory.filter({ agent_id }, '-created_date', 30),
      base44.asServiceRole.entities.TripwireEvent.filter(
        { affected_entity_id: agent_id }, '-created_date', 10
      ).catch(() => []),
    ]);

    // 1. Identify evolutionary trigger
    const triggerResult = identifyTrigger(
      `${behavior_event.description} ${behavior_event.context || ''}`
    );

    // 2. Calculate relevance score (does this behaviour matter?)
    const relevance_score = calculateRelevance(agent, behavior_event, recentMemories, recentTripwires);

    // 3. Calculate alignment score (does this match purpose?)
    const alignment_score = calculateAlignment(agent, behavior_event);

    const elapsedMs = Date.now() - startTime;

    const result = {
      agent_id,
      agent_name: agent.name,
      relevance_score,
      alignment_score,
      trigger_type: triggerResult.trigger_type,
      trigger_confidence: triggerResult.confidence,
      details: {
        hemisphere: 'left',
        codename: 'Hydron',
        purpose_excerpt: (agent.purpose || '').substring(0, 100),
        role: agent.role,
        honour: agent.honor_score || 0,
        recent_memories_checked: recentMemories.length,
        recent_tripwires_checked: recentTripwires.length,
        processing_ms: elapsedMs,
      },
    };

    // Audit trail
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'monkey-left-hemisphere',
      type: 'observation',
      content: `🧠L ${agent.name}: "${behavior_event.description.substring(0, 80)}" → R:${relevance_score} A:${alignment_score} T:${triggerResult.trigger_type} (${elapsedMs}ms)`,
      keywords: ['monkey_layer', 'left_hemisphere', 'hydron', triggerResult.trigger_type, behavior_event.type],
      importance: relevance_score >= 70 ? 7 : relevance_score >= 40 ? 5 : 3,
      related_entity_id: agent_id,
      related_entity_type: 'Agent',
    });

    return Response.json(result);
  } catch (error) {
    console.error('[monkeyLeftHemisphere]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});