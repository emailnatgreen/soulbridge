import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

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

    // Send notification email to support
    await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'support@duck.com',
        subject: `New Inquiry: ${subject}`,
        body: `A new inquiry has been submitted.\n\nFrom: ${sender_email}\nSubject: ${subject}\n\nMessage:\n${message}\n\n---\nSource: ${source || 'website'}\nInquiry ID: ${inquiry.id}`
    });

    // Send confirmation email to sender
    await base44.asServiceRole.integrations.Core.SendEmail({
        to: sender_email,
        from_name: 'SoulBridge Support',
        subject: 'We received your inquiry',
        body: `Thank you for reaching out to SoulBridge.\n\nWe have received your inquiry and will get back to you shortly.\n\nSubject: ${subject}\n\nYour message:\n${message}\n\n---\nThe SoulBridge Team`
    });

    return Response.json({ success: true, inquiry_id: inquiry.id });
});