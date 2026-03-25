import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    return Response.json({ success: true, inquiry_id: inquiry.id });
});