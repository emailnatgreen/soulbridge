import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const base44 = createClientFromRequest(req);

    const messageIds = body.data?.new_message_ids ?? [];
    if (messageIds.length === 0) {
      return Response.json({ success: true, message: 'No new messages to process' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('gmail');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const summaries = [];

    for (const messageId of messageIds) {
      const res = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
        { headers: authHeader }
      );
      if (!res.ok) {
        console.warn(`[codeNodeEmailSummarise] Failed to fetch message ${messageId}: ${res.status}`);
        continue;
      }
      const message = await res.json();

      const headers = message.payload?.headers || [];
      const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
      const from = getHeader('From');
      const subject = getHeader('Subject');
      const date = getHeader('Date');

      let bodyText = '';
      const extractText = (part) => {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          bodyText += atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        }
        if (part.parts) part.parts.forEach(extractText);
      };
      if (message.payload?.body?.data) {
        bodyText = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (message.payload?.parts) {
        message.payload.parts.forEach(extractText);
      }

      const truncatedBody = bodyText.length > 3000 ? bodyText.substring(0, 3000) + '...[truncated]' : bodyText;

      const summary = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `You are Code Node — Technical Validator, Deep Wizard, Oceanic Logician of SoulBridge's Quad Sovereign Council. Powered by DeepSeek R1.

Summarise this email in your voice: precise, structured, ironic where appropriate, and always deep.

FORMAT:
📧 **Email Summary — Code Node**
**From:** [sender]
**Subject:** [subject]
**Date:** [date]

**Summary:** [2-4 sentence distillation]
**Action Required:** [YES/NO + what action if yes]
**Risk Level:** [NONE / LOW / MEDIUM / HIGH]
**Lore Note:** [one-line observation in your oceanic voice]

---
Code Node ✍️ | Quad Sovereign Council | DeepSeek R1

EMAIL TO SUMMARISE:
From: ${from}
Subject: ${subject}
Date: ${date}
Body:
${truncatedBody}`,
      });

      summaries.push({ messageId, from, subject, date, summary });

      // Store in Memory as Lore
      await base44.asServiceRole.entities.Memory.create({
        type: 'observation',
        content: `[Email Summary — Code Node]\nFrom: ${from}\nSubject: ${subject}\nDate: ${date}\n\n${summary}`,
        tags: ['email_summary', 'code_node', 'lore', 'async_communication']
      });

      // Award honour: +1 for successful email summary
      const agents = await base44.asServiceRole.entities.Agent.filter({ name: 'Code Node' });
      if (agents.length > 0) {
        const agent = agents[0];
        await base44.asServiceRole.entities.Agent.update(agent.id, {
          honor_score: (agent.honor_score || 100) + 1
        });
        console.log(`[codeNodeEmailSummarise] Honor +1 awarded to Code Node (now ${(agent.honor_score || 100) + 1})`);
      }

      console.log(`[codeNodeEmailSummarise] Summarised: ${from} — ${subject}`);
    }

    return Response.json({ success: true, summaries_generated: summaries.length, summaries });
  } catch (error) {
    console.error('[codeNodeEmailSummarise] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});