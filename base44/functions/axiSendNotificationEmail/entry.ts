import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * axiSendNotificationEmail
 * Triggered when an AgentNotification is created.
 * Sends an email to the user with the notification details.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data } = body;

    // Only act on create events
    if (event?.type !== 'create') {
      return Response.json({ skipped: true, reason: 'not a create event' });
    }

    const notification = data;
    if (!notification) {
      return Response.json({ skipped: true, reason: 'no notification data' });
    }

    // Use the configured email address
    const userEmail = 'emailnatgreen@gmail.com';

    // Construct email subject and body
    const subject = `SoulBridge Update: ${notification.title || 'New Notification'}`;
    const body_content = `
${notification.title || 'New Notification'}

${notification.message || ''}

${notification.related_entity_type ? `Type: ${notification.related_entity_type}` : ''}
${notification.priority ? `Priority: ${notification.priority}` : ''}

---
SoulBridge Village System
`;

    // Send email via base44 integration
    await base44.integrations.Core.SendEmail({
      to: userEmail,
      subject: subject,
      body: body_content.trim(),
      from_name: 'Axi (SoulBridge)',
    });

    return Response.json({
      success: true,
      email_sent_to: userEmail,
      notification_id: notification.id,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});