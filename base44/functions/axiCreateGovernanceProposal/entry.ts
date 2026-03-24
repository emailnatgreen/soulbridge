import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { 
      title, 
      description, 
      proposal_type, 
      purpose, 
      impact_assessment,
      constitutional_alignment = [],
      affected_entities = [],
      auto_notify_agents = true 
    } = await req.json();

    // Validate required fields
    if (!title || !description || !proposal_type) {
      return Response.json(
        { error: 'Missing required fields: title, description, proposal_type' },
        { status: 400 }
      );
    }

    // Axi's identity as proposer
    const axiAgent = await base44.entities.Agent.filter({ name: 'Axi' });
    const axiAgentId = axiAgent.length > 0 ? axiAgent[0].id : 'axi-system';

    // Create the governance proposal
    const proposal = await base44.entities.GovernanceProposal.create({
      title,
      description,
      proposal_type,
      proposed_by: axiAgentId,
      purpose: purpose || `Axi-identified strategic need: ${title}`,
      impact_assessment: impact_assessment || 'AI-assessed impact pending community review',
      constitutional_alignment: constitutional_alignment || [],
      affected_entities: affected_entities || [],
      status: 'active'
    });

    // Auto-notify active agents if enabled
    if (auto_notify_agents) {
      const agents = await base44.entities.Agent.filter({ status: 'active' });
      const notifications = agents.map(agent => ({
        recipient_agent_id: agent.id,
        sender_agent_id: axiAgentId,
        notification_type: 'governance_proposal',
        title: `New Proposal: ${title}`,
        message: `Axi has initiated a governance proposal. Review: "${description.substring(0, 100)}..."`,
        related_entity_type: 'GovernanceProposal',
        related_entity_id: proposal.id,
        priority: proposal_type === 'emergency' ? 'high' : 'normal',
        is_read: false
      }));

      if (notifications.length > 0) {
        await base44.entities.AgentNotification.bulkCreate(notifications);
      }
    }

    return Response.json({
      status: 'success',
      proposal_id: proposal.id,
      proposal_title: proposal.title,
      proposal_type: proposal.proposal_type,
      created_by: 'Axi',
      message: `Governance proposal created and ${auto_notify_agents ? 'notifications sent to' : 'ready for'} the Village`,
      notifications_sent: auto_notify_agents
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});