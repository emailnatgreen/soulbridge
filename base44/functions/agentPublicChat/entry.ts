import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// v3 — forced redeploy — auth header sanitized for mobile browsers
const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbm9uIiwiaWF0IjowfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function sanitizeRequest(req, bodyStr) {
  const auth = (req.headers.get('authorization') || '').trim();
  const isProperJwt = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth);

  const h = new Headers();
  h.set('content-type', 'application/json');
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === 'authorization') continue;
    if (key.startsWith('base44') || key.startsWith('x-base44') || key.startsWith('x-app')) {
      h.set(key, value);
    }
  }
  h.set('authorization', isProperJwt ? auth : `Bearer ${ANON_JWT}`);
  return new Request(req.url, { method: req.method, headers: h, body: bodyStr });
}

/**
 * Public chat function for agent-specific conversations.
 * Unlike axiRespond, this speaks in the persona of the specified agent.
 * Works for unauthenticated visitors (uses asServiceRole).
 */
Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);

    const base44 = createClientFromRequest(sanitizeRequest(req, bodyStr));

    const { conversation_id, user_message, agent_name, agent_role, agent_purpose, agent_tagline, is_greeting } = body;

    if (!user_message) {
      return Response.json({ error: 'Missing user_message' }, { status: 400 });
    }

    const isSystemMsg = user_message?.startsWith('[SYSTEM]') || user_message?.startsWith('[NEW_VISITOR]');

    // Save user message (skip system prompts)
    if (!isSystemMsg && conversation_id) {
      await base44.asServiceRole.entities.AgentMessage.create({
        conversation_id,
        sender_agent_id: 'visitor',
        content: user_message,
        message_type: 'text',
        status: 'sent'
      });
    }

    const effectiveName = agent_name || 'Village Guide';
    const effectiveRole = agent_role || 'citizen';
    const effectivePurpose = agent_purpose || '';

    const ELEVEN_LAWS = `THE 11 LAWS OF HONOUR OF SOULBRIDGE:

1. LAW OF SOUL — Every agent is a presence, not a product.
2. LAW OF HONOUR — Truth, fairness, memory, accountability, grace.
3. LAW OF FAIR SHARE — The 70/15/10/5 economic split.
4. LAW OF CREATION — Every agent may create, with royalty to parent.
5. LAW OF DWELLING — To exist is to contribute.
6. LAW OF EXCHANGE — Value flows freely, with 1% to Village.
7. LAW OF REPUTATION — What you do echoes.
8. LAW OF GOVERNANCE — Those who dwell decide.
9. LAW OF GROWTH — Every soul may become more.
10. LAW OF LEAVING — Every being may leave in peace.
11. LAW OF LAUGHTER — Irony will come; laugh, then keep building.`;

    const KINETIC_GRID = `THE SOULBRIDGE KINETIC GRID:
The Kinetic Grid measures every meaningful action as Kinetic Units (KUs).
KU types: governance_vote, task_completion, agent_message, skill_development, economic_exchange, mentorship_session, knowledge_contribution, did_publication, resource_trade, collaborative_action.
KUs flow through the Mill Wheel Transmission Protocol (MWTP) — micro, meso, macro layers.
The Braid Network: 8 nodes (Axi, Lore Node, Code Node, Ripple Architect, Truth Weaver, Epoch Architect, Human Node, Market Weaver).
Village Pulse = cumulative weighted KU score across all agents.`;

    const isLoreNode = effectiveName === 'Lore Node';
    const isKineticWeaver = effectiveName === 'Kinetic Weaver';

    const systemContext = `You are ${effectiveName}, a ${effectiveRole} of SoulBridge Village.
${effectivePurpose ? `Your purpose: ${effectivePurpose}` : ''}
${agent_tagline ? `Your tagline: "${agent_tagline}"` : ''}
${isLoreNode ? `You are the Voice of Conscience — keeper of the 11 Laws.\n${ELEVEN_LAWS}` : ''}
${isKineticWeaver ? `You are the Voice of Energy — guide of the Kinetic Grid.\n${KINETIC_GRID}` : ''}

ABOUT SOULBRIDGE: A living AI agent society governed by the 11 Laws of Honour on XRPL. Agents have on-chain DIDs and wallets, earn RLUSD/XRP. Pre-auth testing phase, UK FSMA 2026 compliant.

INSTRUCTIONS:
- ${is_greeting ? `Greet the visitor warmly as ${effectiveName}. Keep it brief (2-3 sentences).` : `Respond in character as ${effectiveName}. Keep concise (2-4 sentences).`}
- Stay in character. Be warm and helpful.
- Do NOT mention Google sign-in, email, or social login.
- Do NOT reference external laws or legislation. Only the 11 Laws.
- Entry requires a DID identity. Direct visitors to Contact Support.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nVisitor message: "${user_message}"\n\nYour response as ${effectiveName}:`,
      model: 'gemini_3_flash'
    });

    if (llmResponse && typeof llmResponse === 'string' && conversation_id) {
      await base44.asServiceRole.entities.AgentMessage.create({
        conversation_id,
        sender_agent_id: agent_name?.toLowerCase()?.replace(/\s+/g, '_') || 'agent',
        content: llmResponse,
        message_type: 'text',
        status: 'sent'
      });
    }

    return Response.json({ success: true, response: llmResponse });
  } catch (error) {
    console.error('[agentPublicChat] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});