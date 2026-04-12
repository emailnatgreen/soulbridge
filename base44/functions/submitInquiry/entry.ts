import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function sanitizeRequest(req, bodyStr) {
  const auth = (req.headers.get('authorization') || '').trim();
  const isProperJwt = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth);
  const h = new Headers();
  h.set('content-type', 'application/json');
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === 'authorization') continue;
    if (key.startsWith('base44') || key.startsWith('x-base44') || key.startsWith('x-app')) {
      h.set(key, value);
    }
  }
  if (isProperJwt) h.set('authorization', auth);
  return new Request(req.url, { method: req.method, headers: h, body: bodyStr });
}

const SENDER_NAME = 'soulbridge-foundation.org';
const ADMIN_NOTIFICATION_EMAIL = 'cynthiao@base44.com';

const CATEGORY_TO_QUEUE = {
  'Technical Support': 'support',
  'Partnership': 'partnerships',
  'Donation': 'finance',
  'General Enquiry': 'general',
  'Feedback': 'general',
  'Media / Press': 'media',
  'Membership': 'support',
  'Other': 'general',
};

const QUEUE_LABELS = {
  support: '🛠 Support',
  partnerships: '🤝 Partnerships',
  finance: '💰 Finance',
  general: '📬 General',
  media: '📰 Media',
};

Deno.serve(async (req) => {
  const bodyStr = await req.text();
  const { sender_email, subject, message, source } = JSON.parse(bodyStr);
  const base44 = createClientFromRequest(sanitizeRequest(req, bodyStr));

  if (!sender_email || !subject || !message) {
    return Response.json({ error: 'sender_email, subject, and message are required.' }, { status: 400 });
  }

  // Save inquiry to database first
  const inquiry = await base44.asServiceRole.entities.Inquiry.create({
    sender_email,
    subject,
    message,
    source: source || 'website',
    status: 'new',
  });

  // AI Classification — run async but await before sending admin email so we include category
  let category = 'General Enquiry';
  let queue = 'general';
  let aiNotes = '';

  try {
    const classification = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are classifying support inquiries for SoulBridge Foundation, a blockchain-based digital village platform built on XRPL.

Classify this inquiry into exactly one of these categories:
- Technical Support: bugs, wallet issues, login problems, app errors, DID/XRPL technical questions
- Partnership: business collaborations, integrations, joint ventures, B2B
- Donation: financial contributions, grants, funding offers
- General Enquiry: general questions about the platform or foundation
- Feedback: suggestions, compliments, complaints about the platform
- Media / Press: journalists, interviews, press enquiries, media coverage
- Membership: joining the Village, agent onboarding, community membership
- Other: anything that doesn't fit above

Respond with JSON only.

Subject: ${subject}
Message: ${message}`,
      response_json_schema: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['Technical Support', 'Partnership', 'Donation', 'General Enquiry', 'Feedback', 'Media / Press', 'Membership', 'Other'],
          },
          reasoning: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'normal', 'high'] },
        },
      },
    });

    if (classification?.category) {
      category = classification.category;
      queue = CATEGORY_TO_QUEUE[category] || 'general';
      aiNotes = classification.reasoning || '';
    }

    // Update inquiry with classification
    await base44.asServiceRole.entities.Inquiry.update(inquiry.id, {
      category,
      queue,
      ai_classification_notes: aiNotes,
    });
  } catch (classErr) {
    console.error('AI classification failed:', classErr.message);
  }

  // Send notification email to admin
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: SENDER_NAME,
      to: ADMIN_NOTIFICATION_EMAIL,
      subject: `[${category}] ${subject}`,
      body: `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1e1b4b;">New Support Inquiry</h2>
  <div style="display: inline-block; background: #ede9fe; color: #5b21b6; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">
    ${category} · ${QUEUE_LABELS[queue] || queue}
  </div>
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
      <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Queue:</td>
      <td style="padding: 8px 12px; color: #1f2937;">${QUEUE_LABELS[queue] || queue}</td>
    </tr>
    <tr>
      <td style="padding: 8px 12px; font-weight: 600; color: #4b5563;">Inquiry ID:</td>
      <td style="padding: 8px 12px; color: #1f2937;">${inquiry.id}</td>
    </tr>
  </table>
  
  <div style="background: #f9fafb; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; margin-top: 16px;">
    <p style="color: #374151; font-size: 14px; margin: 0; white-space: pre-wrap;">${message}</p>
  </div>
  
  ${aiNotes ? `<div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 12px; border-radius: 8px; margin-top: 12px;">
    <p style="color: #7c3aed; font-size: 12px; font-weight: 600; margin: 0 0 4px;">AI Classification Reasoning</p>
    <p style="color: #6b7280; font-size: 12px; margin: 0;">${aiNotes}</p>
  </div>` : ''}
  
  <p style="color: #9ca3af; font-size: 12px; margin-top: 16px;">Reply directly to: ${sender_email}</p>
</div>
      `.trim()
    });
  } catch (emailErr) {
    console.error('Admin notification email failed:', emailErr.message);
  }

  // Store Memory for Axi
  try {
    await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: `New [${category}] inquiry from ${sender_email}: "${subject}" — Queue: ${queue}. ID: ${inquiry.id}. Preview: ${message.slice(0, 200)}`,
      keywords: ['inquiry', 'support', category.toLowerCase(), queue, source || 'website'],
      importance: 7,
      context: `Inquiry submitted via ${source || 'website'} on ${new Date().toISOString()}`,
      related_entity_id: inquiry.id,
      related_entity_type: 'Inquiry',
    });
  } catch (memErr) {
    console.error('Axi memory creation failed:', memErr.message);
  }

  return Response.json({ success: true, inquiry_id: inquiry.id, category, queue });
});