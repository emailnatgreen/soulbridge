import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { proposal_id, proposal_title, proposal_type, proposed_by } = await req.json();

    if (!proposal_id || !proposal_title || !proposal_type || !proposed_by) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch all active agents to notify
    const agents = await base44.asServiceRole.entities.Agent.filter({ status: 'active' });
    
    // Create notifications for all agents
    const notifications = [];
    for (const agent of agents) {
      const notificationPayload = {
        recipient_agent_id: agent.id,
        notification_type: 'governance_proposal_created',
        title: `New Proposal: ${proposal_title}`,
        message: `A new ${proposal_type.replace('_', ' ')} proposal has been submitted for voting.`,
        proposal_id: proposal_id,
        action_url: `/GovernanceHub`,
        is_read: false,
        priority: proposal_type === 'law_amendment' || proposal_type === 'agent_discipline' ? 'high' : 'normal'
      };
      notifications.push(notificationPayload);
    }

    // Batch create notifications
    if (notifications.length > 0) {
      await base44.asServiceRole.entities.AgentNotification.bulkCreate(notifications);
    }

    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      message: `Notified ${notifications.length} agents about the new governance proposal`
    });

  } catch (error) {
    console.error('Error notifying agents:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});