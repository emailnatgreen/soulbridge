import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const SENDER_NAME = 'soulbridge-foundation.org';
// Send admin notification to a registered app user
const ADMIN_NOTIFICATION_EMAIL = 'cynthiao@base44.com';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    const { sender_email, subject, message, source } = await req.json();

    if (!sender_email || !subject || !message) {
        return Response.json({ error: 'sender_email, subject, and message are required.' }, { status: 400 });
    }

    // Save inquiry to database
    const inquiry = await base44.asServiceRole.entities.Inquiry.create({
        sender_email,
        subject,
        message,
        source: source || 'website',
        status: 'new'
    });

    // Send notification email to admin (must be a registered app user)
    try {
        await base44.asServiceRole.integrations.Core.SendEmail({
            from_name: SENDER_NAME,
            to: ADMIN_NOTIFICATION_EMAIL,
            subject: `[New Inquiry] ${subject}`,
            body: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e1b4b;">New Support Inquiry</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr>
      <td style="padding: 8px 12px; font-weight: 600; color: #4b5563; width: 120px;">From:</td>
      <td style="padding: 8px 12px; color: #1f2937;">${sender_email}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Subject:</td>
      <td style="padding: 8px 12px; color: #1f2937;">${subject}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Source:</td>
      <td style="padding: 8px 12px; color: #1f2937;">${source || 'website'}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Inquiry ID:</td>
      <td style="padding: 8px 12px; color: #1f2937;">${inquiry.id}</td>
    </tr>
  </table>
  
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin-top: 16px;">
    <p style="color: #374151; font-size: 14px; margin: 0; white-space: pre-wrap;">${message}</p>
  </div>
  
  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Reply directly to: ${sender_email}</p>
</div>
            `.trim()
        });
    } catch (emailErr) {
        console.error('Admin notification email failed:', emailErr.message);
        // Don't fail the whole request if email fails — inquiry is already saved
    }

    return Response.json({ success: true, inquiry_id: inquiry.id });
});