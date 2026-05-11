import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Context Assembly Engine — Phase 1: Hydrogeo Layer
 *
 * UPGRADED: Now wires through the Hydrogeo Context Gate.
 * Agent context is:
 *   - Persistent: pulls cross-session Memory + Synthesis
 *   - Auditable: every access logged via hydrogeoContextGate
 *   - Sincere: passes Shadow Sieve + 100-Prisoner Gate before retrieval
 *   - Deep: includes honour history, synthesis themes, and reputation signals
 */

const RECENT_MESSAGES_LIMIT = 8;
const MAX_BRIEFING_LENGTH = 2000;

function truncateString(str, maxLen) {
  return str && str.length > maxLen ? str.substring(0, maxLen - 3) + '...' : str;
}

function compactifyMessages(messages) {
  return messages
    .filter(m => m?.content)
    .map(m => {
      const role = m.role === 'user' ? 'User' : (m.metadata?.sourceAgentId ? 'Agent' : 'Axi');
      return `${role}: ${truncateString(m.content, 150)}`;
    })
    .join('\n');
}

async function assembleHydrogeoContext(base44, conversationId, agentId, accessDepth) {
  // 1. Gate check via Hydrogeo Context Gate
  let gateResult;
  try {
    const gateResponse = await base44.asServiceRole.functions.invoke('hydrogeoContextGate', {
      action: 'validate',
      agent_id: agentId,
      access_depth: accessDepth,
      request_context: { conversation_id: conversationId, timestamp: new Date().toISOString() },
    });
    gateResult = gateResponse.data || gateResponse;
  } catch (gateErr) {
    console.warn('[assembleAgentContext] Gate check failed, proceeding with basic access:', gateErr.message);
    gateResult = { granted: true, depth: 'basic', fallback: true };
  }

  if (!gateResult.granted) {
    return {
      success: false,
      briefing: '',
      gate_denied: true,
      gate_reason: gateResult.reason,
      gate_details: gateResult,
    };
  }

  const depth = gateResult.depth || 'basic';

  // 2. Retrieve recent messages (always available)
  const messages = await base44.asServiceRole.entities.AgentMessage.filter(
    { conversation_id: conversationId },
    '-created_date',
    RECENT_MESSAGES_LIMIT
  );

  // 3. Retrieve agent's persistent memories (cross-session)
  const memoryLimit = depth === 'full' ? 10 : depth === 'deep' ? 6 : 3;
  const agentMemories = await base44.asServiceRole.entities.Memory.filter(
    { agent_id: agentId },
    '-importance',
    memoryLimit
  );

  // 4. Retrieve synthesis (deep knowledge graphs)
  let synthesisContext = '';
  if (depth === 'deep' || depth === 'full') {
    const syntheses = await base44.asServiceRole.entities.Synthesis.filter(
      { agent_id: agentId, status: 'completed' },
      '-created_date',
      3
    );

    if (syntheses.length > 0) {
      synthesisContext = syntheses.map(s => {
        const themes = (s.themes || []).join(', ');
        const entities = (s.entities || []).slice(0, 5).map(e => e.name).join(', ');
        return `Synthesis: ${truncateString(s.summary, 100)} | Themes: ${themes} | Entities: ${entities}`;
      }).join('\n');
    }
  }

  // 5. Retrieve honour history (for deep/full access)
  let honourContext = '';
  if (depth === 'deep' || depth === 'full') {
    const agent = await base44.asServiceRole.entities.Agent.get(agentId);
    if (agent) {
      const reputationEvents = await base44.asServiceRole.entities.ReputationEvent.filter(
        { agent_id: agentId },
        '-created_date',
        5
      );

      honourContext = [
        `Honour Score: ${agent.honor_score || 'Unknown'}/100`,
        `Role: ${agent.role || 'citizen'}`,
        `Status: ${agent.status || 'active'}`,
        reputationEvents.length > 0
          ? `Recent Honour: ${reputationEvents.map(e => `${e.event_type} (${e.impact > 0 ? '+' : ''}${e.impact})`).join(', ')}`
          : '',
      ].filter(Boolean).join('\n');
    }
  }

  // 6. Retrieve active projects context
  const recentProjects = await base44.asServiceRole.entities.AIProject.filter(
    { status: 'active' },
    '-updated_date',
    2
  );

  // 7. Build the unified briefing
  const conversationSummary = compactifyMessages(messages || []);
  const memoriesSnippet = agentMemories.length > 0
    ? agentMemories.map(m => `[${m.type}] ${truncateString(m.content, 80)}`).join('\n')
    : 'No prior memories.';
  const projectsContext = recentProjects.length > 0
    ? recentProjects.map(p => `${p.title} (${p.status})`).join(', ')
    : 'No active projects.';

  const sections = [
    `RECENT CONVERSATION:`,
    conversationSummary || '(No messages)',
    `\nPERSISTENT MEMORY (${agentMemories.length} records):`,
    memoriesSnippet,
    `\nACTIVE PROJECTS: ${projectsContext}`,
  ];

  if (honourContext) {
    sections.push(`\nHONOUR & REPUTATION:`);
    sections.push(honourContext);
  }

  if (synthesisContext) {
    sections.push(`\nKNOWLEDGE SYNTHESIS:`);
    sections.push(synthesisContext);
  }

  const briefing = sections.join('\n');

  return {
    success: true,
    briefing: truncateString(briefing, MAX_BRIEFING_LENGTH),
    messageCount: messages?.length || 0,
    memoriesCount: agentMemories?.length || 0,
    depth,
    gate: {
      granted: true,
      honour: gateResult.honour,
      coherence: gateResult.coherence_score,
      fallback: gateResult.fallback || false,
    },
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { conversation_id, agent_id, access_depth } = body;

    if (!conversation_id || !agent_id) {
      return Response.json(
        { error: 'Missing conversation_id or agent_id' },
        { status: 400 }
      );
    }

    const context = await assembleHydrogeoContext(
      base44,
      conversation_id,
      agent_id,
      access_depth || 'basic'
    );

    return Response.json(context);
  } catch (error) {
    console.error('[assembleAgentContext] Handler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});