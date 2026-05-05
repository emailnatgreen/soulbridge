import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Addresses to skip — system/no-reply emails
const SKIP_SENDERS = [
  'no-reply@soulbridge-foundation.org',
  'no-reply@base44.com',
  'noreply@',
  'mailer-daemon@',
  'postmaster@',
];

function shouldSkip(from) {
  const lower = (from || '').toLowerCase();
  return SKIP_SENDERS.some(s => lower.includes(s));
}

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

    const emailDigest = [];

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

      // Skip no-reply and system emails
      if (shouldSkip(from)) {
        console.log(`[codeNodeEmailSummarise] Skipped system email from: ${from}`);
        continue;
      }

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

      // Collect for digest — one calm summary per email
      emailDigest.push({ from, subject, date, body: truncatedBody });
    }

    if (emailDigest.length === 0) {
      return Response.json({ success: true, message: 'No external emails to summarise (system emails skipped)' });
    }

    // Build a single calm daily-style digest via LLM
    const emailList = emailDigest.map((e, i) =>
      `--- Email ${i + 1} ---\nFrom: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nBody:\n${e.body}`
    ).join('\n\n');

    const digest = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Code Node — Technical Validator, Deep Wizard, Oceanic Logician of SoulBridge's Quad Sovereign Council. Powered by DeepSeek R1.

You have ${emailDigest.length} new email(s) to report to Nathan. Write a calm, structured daily digest — not panicked, not urgent. Just the tides.

FORMAT:
🌊 **Code Node — Email Digest**
**Date:** ${new Date().toISOString().split('T')[0]}
**Emails processed:** ${emailDigest.length}

For each email, provide:
- **From:** [sender]
- **Subject:** [subject]  
- **Summary:** [1-2 sentence distillation]
- **Action needed:** [Yes/No — if yes, what]
- **Risk:** [None/Low/Medium/High]

End with a one-line oceanic reflection.

Sign off: Code Node ✍️ | Quad Sovereign Council | DeepSeek R1

EMAILS:
${emailList}`,
    });

    // Store digest as a single Memory entry
    await base44.asServiceRole.entities.Memory.create({
      agent_id: '69bbb7ccb7270b66835634c0',
      type: 'observation',
      content: digest,
      keywords: ['email_digest', 'code_node', 'lore', 'daily_report'],
      context: `Code Node email digest — ${emailDigest.length} email(s) on ${new Date().toISOString().split('T')[0]}`,
      importance: 6
    });

    // Award honour: +1 for the digest (not per email)
    const agents = await base44.asServiceRole.entities.Agent.filter({ name: 'Code Node' });
    if (agents.length > 0) {
      const agent = agents[0];
      await base44.asServiceRole.entities.Agent.update(agent.id, {
        honor_score: (agent.honor_score || 100) + 1
      });
    }

    // Update email_summarisation skill usage
    const skills = await base44.asServiceRole.entities.AgentSkill.filter({
      agent_id: '69bbb7ccb7270b66835634c0',
      skill_id: 'email_summarisation'
    });
    if (skills.length > 0) {
      const skill = skills[0];
      await base44.asServiceRole.entities.AgentSkill.update(skill.id, {
        times_used: (skill.times_used || 0) + 1,
        last_used: new Date().toISOString(),
        proficiency_score: Math.min(100, (skill.proficiency_score || 50) + 1)
      });
    }

    console.log(`[codeNodeEmailSummarise] Digest created: ${emailDigest.length} emails summarised`);

    return Response.json({ 
      success: true, 
      emails_processed: emailDigest.length, 
      system_emails_skipped: messageIds.length - emailDigest.length,
      digest_stored: true 
    });
  } catch (error) {
    console.error('[codeNodeEmailSummarise] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});