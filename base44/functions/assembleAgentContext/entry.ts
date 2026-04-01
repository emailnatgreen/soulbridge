import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Context Assembly Engine
 * Selectively retrieves and synthesizes conversational history, memories, and entity data
 * into a compact, actionable briefing for summoned agents.
 */

const RECENT_MESSAGES_LIMIT = 8;
const MAX_BRIEFING_LENGTH = 1000;

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

async function assembleContext(base44, conversationId, agentId) {
  try {
    // Retrieve recent messages
    const messages = await base44.asServiceRole.entities.AgentMessage.filter(
      { conversation_id: conversationId },
      '-created_date',
      RECENT_MESSAGES_LIMIT
    );

    // Retrieve agent's own memories (if any)
    const agentMemories = await base44.asServiceRole.entities.Memory.filter(
      { agent_id: agentId, type: 'conversation_snippet' },
      '-created_date',
      3
    );

    // Retrieve recent projects to understand context
    const recentProjects = await base44.asServiceRole.entities.AIProject.filter(
      { status: 'active' },
      '-updated_date',
      2
    );

    // Build compact conversation history
    const conversationSummary = compactifyMessages(messages || []);

    // Build memories snippet
    const memoriesSnippet = agentMemories && agentMemories.length > 0
      ? agentMemories.map(m => truncateString(m.content, 80)).join(' | ')
      : 'No prior memories.';

    // Build projects context
    const projectsContext = recentProjects && recentProjects.length > 0
      ? recentProjects.map(p => `${p.title} (${p.status})`).join(', ')
      : 'No active projects.';

    // Synthesize into compact briefing
    const briefing = [
      `RECENT CONVERSATION:`,
      conversationSummary || '(No messages)',
      `\nKEY CONTEXT:`,
      `Active Projects: ${projectsContext}`,
      `Your Memories: ${memoriesSnippet}`,
    ].join('\n');

    return {
      success: true,
      briefing: truncateString(briefing, MAX_BRIEFING_LENGTH),
      messageCount: messages?.length || 0,
      memoriesCount: agentMemories?.length || 0,
    };
  } catch (error) {
    console.error('[assembleAgentContext] Error:', error.message);
    return {
      success: false,
      briefing: '',
      error: error.message,
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { conversation_id, agent_id } = body;

    if (!conversation_id || !agent_id) {
      return Response.json(
        { error: 'Missing conversation_id or agent_id' },
        { status: 400 }
      );
    }

    const context = await assembleContext(base44, conversation_id, agent_id);

    return Response.json(context);
  } catch (error) {
    console.error('[assembleAgentContext] Handler error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});