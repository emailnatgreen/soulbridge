import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only handle new requests
    if (event?.type !== 'create' || data?.status !== 'requested') {
      return Response.json({ skipped: true });
    }

    const mentorAgentId = data.mentor_agent_id;
    const menteeAgentId = data.mentee_agent_id;

    if (!mentorAgentId || !menteeAgentId) {
      return Response.json({ error: 'Missing agent IDs' }, { status: 400 });
    }

    // Fetch mentor and mentee agent records
    const [mentorAgents, menteeAgents] = await Promise.all([
      base44.asServiceRole.entities.Agent.filter({ id: mentorAgentId }),
      base44.asServiceRole.entities.Agent.filter({ id: menteeAgentId }),
    ]);

    const mentorAgent = mentorAgents[0];
    const menteeAgent = menteeAgents[0];

    if (!mentorAgent) {
      console.log('Mentor agent not found:', mentorAgentId);
      return Response.json({ error: 'Mentor agent not found' }, { status: 404 });
    }

    // The agent's created_by field is the owner's email
    const mentorEmail = mentorAgent.created_by;
    if (!mentorEmail) {
      console.log('No email for mentor agent');
      return Response.json({ error: 'No mentor email' }, { status: 404 });
    }

    const menteeName = menteeAgent?.name || 'An agent';
    const focusAreas = (data.focus_areas || []).join(', ') || 'General mentorship';
    const goals = (data.goals || []).map(g => g.goal).filter(Boolean).join(', ') || 'Not specified';

    const subject = `🤝 New Mentorship Request from ${menteeName}`;
    const body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); border-radius: 12px; padding: 24px; color: white; margin-bottom: 20px;">
          <h1 style="margin: 0 0 8px; font-size: 22px;">New Mentorship Request</h1>
          <p style="margin: 0; opacity: 0.9; font-size: 14px;">Someone wants to learn from ${mentorAgent.name || 'you'}!</p>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #334155;">
            <strong>${menteeName}</strong> has requested mentorship with your agent <strong>${mentorAgent.name || 'your agent'}</strong>.
          </p>

          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 120px;">Focus Areas</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${focusAreas}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Goals</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${goals}</td>
            </tr>
            ${data.notes ? `<tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Notes</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 13px;">${data.notes}</td>
            </tr>` : ''}
          </table>
        </div>

        <div style="text-align: center; margin-top: 24px;">
          <p style="color: #64748b; font-size: 13px;">
            Log in to SoulBridge to accept or decline this request in the Mentorship Hub.
          </p>
        </div>
      </div>
    `;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: mentorEmail,
      subject,
      body,
      from_name: 'SoulBridge Mentorship',
    });

    console.log(`Mentorship request notification sent to ${mentorEmail} for request ${event.entity_id}`);
    return Response.json({ success: true, notified: mentorEmail });
  } catch (error) {
    console.error('Notification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});