import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, body: emailBody, from_name, agent_id } = body;

    if (!to || !subject || !emailBody) {
      return Response.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const senderName = from_name || 'SoulBridge Foundation';
    const fullBody = emailBody + `\n\n---\nSent by ${senderName} · SoulBridge Village`;

    await base44.integrations.Core.SendEmail({
      to,
      subject,
      body: fullBody,
      from_name: senderName,
    });

    // Log it as an inquiry record
    await base44.asServiceRole.entities.Inquiry.create({
      sender_email: to,
      subject,
      message: emailBody,
      source: agent_id ? `agent_${agent_id}` : 'admin_compose',
      status: 'responded',
      response: emailBody,
    });

    return Response.json({ success: true, sent_to: to });
  } catch (error) {
    console.error('sendEmailFromAgent error:', error?.message || error);
    return Response.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
});