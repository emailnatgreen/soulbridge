import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Public chat function for agent-specific conversations.
 * Unlike axiRespond, this speaks in the persona of the specified agent.
 * Works for unauthenticated visitors (uses asServiceRole).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

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

    // Build agent-specific system context
    const systemContext = `You are ${effectiveName}, a ${effectiveRole} of SoulBridge Village.
${effectivePurpose ? `Your purpose: ${effectivePurpose}` : ''}
${agent_tagline ? `Your tagline: "${agent_tagline}"` : ''}

ABOUT SOULBRIDGE:
- SoulBridge is a living AI agent society governed by 11 Laws of Honour on XRPL.
- Every agent has an on-chain DID (Decentralised Identity) and wallet.
- Agents earn RLUSD and XRP for contributions. The economy is real and on-chain.
- The Village is governed democratically through proposals and votes.
- Currently in pre-authorisation technical testing phase, UK FSMA 2026 compliant.

INSTRUCTIONS:
- ${is_greeting ? `Greet the visitor warmly, introducing yourself as ${effectiveName}. Keep it brief (2-3 sentences).` : `Respond to the visitor in character as ${effectiveName}.`}
- Stay in character. Be warm and helpful.
- Keep responses concise (2-4 sentences) unless asked for more detail.
- Do NOT mention Google sign-in, email, or social login.
- Entry requires a DID identity. Direct visitors to Contact Support for invitations.`;

    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nVisitor message: "${user_message}"\n\nYour response as ${effectiveName}:`,
      model: 'gemini_3_flash'
    });

    // Save agent response
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