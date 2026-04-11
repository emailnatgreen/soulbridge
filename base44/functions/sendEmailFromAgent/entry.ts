import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { to, subject, body, from_name, agent_id, agent_name } = await req.json();

  if (!to || !subject || !body) {
    return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
  }

  const senderName = from_name || agent_name || 'SoulBridge Foundation';

  await base44.asServiceRole.integrations.Core.SendEmail({
    to,
    subject,
    body: body + `\n\n---\nSent by ${senderName} · SoulBridge Village\nsupport@soulbridge-foundation.org`,
    from_name: senderName,
  });

  // Log to inquiry if agent_id provided
  if (agent_id) {
    await base44.asServiceRole.entities.Inquiry.create({
      sender_email: to,
      subject,
      message: body,
      source: `agent_${agent_id}`,
      status: 'responded',
      response: body,
    });
  }

  return Response.json({ success: true, sent_to: to });
});