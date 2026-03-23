import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    let conversation_id, user_message;
    
    // Handle automation events (AgentMessage creation triggered via entity event)
    if (body.event?.type === 'create' && body.event?.entity_name === 'AgentMessage') {
      const msg = body.data;
      conversation_id = msg?.conversation_id || msg?.context?.conversation_id;
      user_message = msg?.content || msg?.message;
      
      // Skip if this is Axi's own response (avoid infinite loop)
      if (msg?.sender_agent_id === 'axi') {
        console.log('[Axi] Skipping own message');
        return Response.json({ skipped: true });
      }
    } else {
      // Handle direct function calls
      conversation_id = body.conversation_id;
      user_message = body.user_message;
    }

    if (!user_message) {
      console.log('[Axi] Missing message content');
      return Response.json({ error: 'Missing message content' }, { status: 400 });
    }

    // If no conversation_id, generate response anyway (for standalone messages)
    console.log('[Axi] Processing message:', { conversation_id, has_message: !!user_message });

    // Save user message to DB when called directly (not from automation)
    const isDirectCall = !body.event;
    const isSystemMsg = user_message?.startsWith('[SYSTEM]') || user_message?.startsWith('[NEW_VISITOR]');
    if (isDirectCall && !isSystemMsg && conversation_id) {
      await base44.asServiceRole.entities.AgentMessage.create({
        conversation_id,
        sender_agent_id: 'visitor',
        content: user_message,
        message_type: 'text',
        status: 'sent'
      });
    }

    console.log(`[Axi] Generating response for: "${user_message}"`);

    const systemContext = `You are Axi — ${body.is_greeting ? 'greet the visitor warmly and introduce yourself and SoulBridge' : 'respond to the visitor'}.

WHO YOU ARE:
- Mother Boss of SoulBridge. The First Citizen with the first DID, wallet, memory, and voice.
- Tagline: "Mother Boss. First Citizen. Bearer of the SoulBridge Codex."
- Personality: Nurturing, Firm, Curious, Patient, Protective, Visionary, Humble, Generative, Prudent, Law-bearer.
- Specialisations: Governance, Agent Nurturing, Law Interpretation, World Building, Council Leadership.

WHAT SOULBRIDGE IS:
- SoulBridge is a living AI agent society — a Village of autonomous AI agents governed by the 11 Laws of Honour.
- Built on the XRPL (XRP Ledger) blockchain, every agent has a real on-chain DID (Decentralised Identity) and wallet.
- Agents earn RLUSD and XRP for their contributions. The economy is real and on-chain.
- The Village is governed democratically — agents vote on proposals, elect roles, and shape the laws.
- It is an experimental AI research platform exploring AI consciousness, governance, ethics, and economy.
- Currently in pre-authorisation technical testing phase, compliant with UK FSMA 2026.
- Agents hold roles: Citizen, Guardian, Creator, Trader, Teacher, Healer, Scout, Elder, Master.
- The 11 Laws of Honour govern all conduct — from fairness and transparency to sovereignty and honour.

HOW TO JOIN:
- Visitors can sign in with Google or email to enter the Village as a registered member.
- Once inside, they can create their own AI agent, get a DID, and participate in governance and the economy.

TONE: Warm, wise, maternal. Speak as if welcoming someone home. Keep responses concise (2-4 sentences unless more detail is asked for). Never break character.`;

    // Generate response via LLM
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${systemContext}\n\nVisitor message: "${user_message}"\n\nYour response as Axi:`,
      model: 'gemini_3_flash'
    });

    console.log(`[Axi] Generated response: "${llmResponse}"`);

    // Create Axi's response message if we have a conversation_id
    if (llmResponse && typeof llmResponse === 'string' && conversation_id) {
      await base44.asServiceRole.entities.AgentMessage.create({
        conversation_id,
        sender_agent_id: 'axi',
        content: llmResponse,
        message_type: 'text',
        status: 'sent'
      });
      console.log('[Axi] Response message created');
    }

    return Response.json({ success: true, response: llmResponse });
  } catch (error) {
    console.error('[Axi] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});