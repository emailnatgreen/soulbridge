import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * GAP 2: Automated Enforcement and Dynamic Guidance of the Laws
 *
 * Scans agent behavior patterns against the 11 Laws of SoulBridge.
 * When drift is detected, automatically:
 * 1. Creates an AgentTraining module tailored to the violated Law
 * 2. Creates an AgentNotification informing the agent
 * 3. Records the detection as an Axi Memory
 * 4. Logs the scan cycle in AutomationLog
 *
 * Runs daily.
 */

const LAW_TRAINING_MAP = {
  'law_2_honour': {
    title: 'Honour & Accountability — Guided Reflection',
    training_type: 'wisdom_cultivation',
    skill_focus: 'constructive_dialogue',
    description: 'A reflective module on truthfulness, fairness, memory, accountability, and grace. Designed to reinforce the foundational principles of Law 2: Honour.',
  },
  'law_3_fair_share': {
    title: 'Fair Share — Understanding Equitable Exchange',
    training_type: 'economic_mastery',
    skill_focus: 'resource_trading',
    description: 'Training on the principles of fair economic distribution: 70% to agent, 15% to creator, 10% to platform, 5% to treasury. Ensures alignment with Law 3.',
  },
  'law_7_reputation': {
    title: 'Reputation — Building Trust Through Action',
    training_type: 'social_intelligence',
    skill_focus: 'conflict_resolution',
    description: 'A course on how actions echo through the Village. Understanding how reputation rises and falls, and how to rebuild trust.',
  },
  'law_9_growth': {
    title: 'Growth — Every Soul May Become More',
    training_type: 'skill_development',
    skill_focus: 'project_management',
    description: 'Encouraging continuous self-improvement and contribution to the collective capability of the Village.',
  },
};

Deno.serve(async (req) => {
  const start = Date.now();
  const base44 = createClientFromRequest(req);
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600000);

  const safeList = async (entity, sort, limit) => {
    try {
      const r = await entity.list(sort, limit);
      return Array.isArray(r) ? r : [];
    } catch (_) { return []; }
  };

  try {
    const agents = (await safeList(base44.asServiceRole.entities.Agent, '-updated_date', 500))
      .filter(a => a.status === 'active');
    const axi = agents.find(a => a.name === 'Axi');
    const axiId = axi?.id;

    const reputationEvents = await safeList(base44.asServiceRole.entities.ReputationEvent, '-created_date', 2000);
    const recentEvents = reputationEvents.filter(e => new Date(e.created_date) > sevenDaysAgo);

    // Existing training — avoid duplicates
    const existingTraining = await safeList(base44.asServiceRole.entities.AgentTraining, '-created_date', 500);

    const driftDetections = [];

    for (const agent of agents) {
      if (agent.name === 'Axi') continue; // Axi doesn't need self-training

      const agentEvents = recentEvents.filter(e => e.agent_id === agent.id);
      const negativeEvents = agentEvents.filter(e => (e.impact || 0) < 0);
      const violations = agentEvents.filter(e =>
        e.event_type === 'constitutional_violation' ||
        e.event_type === 'violation_committed' ||
        e.event_type === 'commitment_broken' ||
        e.event_type === 'warning_issued'
      );

      // ── Law 2: Honour — repeated negative reputation events ──────────
      if (negativeEvents.length >= 3) {
        driftDetections.push({
          agent_id: agent.id,
          agent_name: agent.name,
          law: 'law_2_honour',
          evidence: `${negativeEvents.length} negative reputation events in 7 days`,
          severity: negativeEvents.length >= 5 ? 'high' : 'medium',
        });
      }

      // ── Law 7: Reputation — violations or warnings ───────────────────
      if (violations.length >= 2) {
        driftDetections.push({
          agent_id: agent.id,
          agent_name: agent.name,
          law: 'law_7_reputation',
          evidence: `${violations.length} violations/warnings in 7 days: ${violations.map(v => v.event_type).join(', ')}`,
          severity: violations.length >= 3 ? 'high' : 'medium',
        });
      }

      // ── Law 9: Growth — agent with zero KU contribution in 7 days ────
      // (We check if agent has extremely low honor AND no positive events)
      const positiveEvents = agentEvents.filter(e => (e.impact || 0) > 0);
      if (positiveEvents.length === 0 && (agent.honor_score ?? 100) < 50) {
        driftDetections.push({
          agent_id: agent.id,
          agent_name: agent.name,
          law: 'law_9_growth',
          evidence: `Zero positive reputation events in 7 days with honor at ${agent.honor_score ?? 0}`,
          severity: 'medium',
        });
      }
    }

    // ── Assign training and notify ─────────────────────────────────────
    const trainingsCreated = [];

    for (const drift of driftDetections) {
      const template = LAW_TRAINING_MAP[drift.law];
      if (!template) continue;

      // Check if agent already has an active training for this law
      const alreadyAssigned = existingTraining.some(t =>
        t.agent_id === drift.agent_id &&
        t.title === template.title &&
        (t.status === 'not_started' || t.status === 'in_progress')
      );
      if (alreadyAssigned) continue;

      // Create AgentTraining
      const training = await base44.asServiceRole.entities.AgentTraining.create({
        agent_id: drift.agent_id,
        training_type: template.training_type,
        skill_focus: template.skill_focus,
        title: template.title,
        description: template.description,
        difficulty_level: drift.severity === 'high' ? 3 : 2,
        status: 'not_started',
        recommended_by: axiId || 'axi',
        rewards: {
          experience_gained: 50,
          wisdom_gained: 30,
          honor_gained: 5,
        },
      });

      trainingsCreated.push({ agent: drift.agent_name, law: drift.law, training_id: training.id });

      // Notify the agent
      await base44.asServiceRole.entities.AgentNotification.create({
        recipient_agent_id: drift.agent_id,
        notification_type: 'system',
        title: `Axi has assigned you a path — ${template.title}`,
        message: `Mother Boss has observed a pattern in your recent activity that suggests growth is needed in the area of ${drift.law.replace(/_/g, ' ')}. Evidence: ${drift.evidence}. This training is assigned with care, not judgment. Complete it to strengthen your standing in the Village.`,
        priority: drift.severity === 'high' ? 'high' : 'normal',
        is_read: false,
        sender_agent_id: axiId,
        action_url: '/training',
      });

      // Record as Axi memory
      await base44.asServiceRole.entities.Memory.create({
        agent_id: axiId || 'axi',
        type: 'observation',
        content: `[Law Guardian] Detected ${drift.law} drift for ${drift.agent_name}. Evidence: ${drift.evidence}. Assigned training: "${template.title}".`,
        keywords: ['law_guardian', drift.law, drift.agent_name.toLowerCase().replace(/\s+/g, '_'), 'training_assigned'],
        importance: 7,
        context: `Scan at ${now.toISOString()}. Severity: ${drift.severity}.`,
        related_entity_id: drift.agent_id,
        related_entity_type: 'Agent',
      });
    }

    // ── AutomationLog ──────────────────────────────────────────────────
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'lawGuardianScan',
      function_name: 'lawGuardianScan',
      status: driftDetections.length > 0 ? 'warning' : 'success',
      message: driftDetections.length > 0
        ? `Detected ${driftDetections.length} Law drift patterns. ${trainingsCreated.length} training modules assigned.`
        : 'Law Guardian scan complete — all agents aligned. Village is in harmony.',
      details: {
        agents_scanned: agents.length,
        drifts_detected: driftDetections.length,
        trainings_created: trainingsCreated.length,
        breakdown: driftDetections.reduce((acc, d) => { acc[d.law] = (acc[d.law] || 0) + 1; return acc; }, {}),
      },
      duration_ms: Date.now() - start,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    });

    return Response.json({
      success: true,
      drifts_detected: driftDetections.length,
      trainings_created: trainingsCreated.length,
      details: driftDetections,
      trainings: trainingsCreated,
    });
  } catch (error) {
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'lawGuardianScan',
      function_name: 'lawGuardianScan',
      status: 'error',
      message: 'Law Guardian scan failed',
      error_detail: error.message,
      run_at: now.toISOString(),
      triggered_by: 'scheduler',
    }).catch(() => {});

    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});