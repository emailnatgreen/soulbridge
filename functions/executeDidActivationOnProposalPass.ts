import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { event, data } = body;

    // Only execute on update events
    if (event.type !== 'update') {
      return Response.json({ status: 'skipped', reason: 'not an update event' });
    }

    // Check if this is a DID activation proposal that just passed
    if (!data || data.status !== 'passed' || !data.action_data || data.action_data.action_type !== 'activate_did') {
      return Response.json({ status: 'skipped', reason: 'not a passed DID activation proposal' });
    }

    const proposalId = event.entity_id;
    const { wallet_id, agent_id } = data.action_data;

    // Execute the DID activation
    const activationResult = await base44.asServiceRole.functions.invoke('activateDID', {
      wallet_id,
      agent_id,
      approval_required: false // Approval already happened via governance vote
    });

    if (activationResult.data.status !== 'success') {
      // Log failure but don't crash
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'Execute DID Activation on Proposal Pass',
        function_name: 'executeDidActivationOnProposalPass',
        status: 'error',
        message: `Failed to activate DID after proposal ${proposalId} passed`,
        error_detail: activationResult.data.error || 'Unknown error',
        details: {
          proposal_id: proposalId,
          wallet_id,
          agent_id
        },
        run_at: new Date().toISOString(),
        triggered_by: 'entity_event'
      });

      return Response.json({
        status: 'error',
        message: 'DID activation failed after proposal passed',
        error: activationResult.data.error
      }, { status: 500 });
    }

    // Update proposal status to executed
    await base44.asServiceRole.entities.GovernanceProposal.update(proposalId, {
      status: 'executed',
      execution_result: {
        action: 'activate_did',
        wallet_id,
        agent_id,
        executed_at: new Date().toISOString(),
        did: activationResult.data.did
      }
    });

    // Log success
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Execute DID Activation on Proposal Pass',
      function_name: 'executeDidActivationOnProposalPass',
      status: 'success',
      message: `DID activation executed for proposal ${proposalId}`,
      details: {
        proposal_id: proposalId,
        wallet_id,
        agent_id,
        did: activationResult.data.did,
        activated_at: activationResult.data.activated_at
      },
      run_at: new Date().toISOString(),
      triggered_by: 'entity_event'
    });

    return Response.json({
      status: 'success',
      message: 'DID activation executed after proposal passed',
      proposal_id: proposalId,
      wallet_id,
      agent_id,
      did: activationResult.data.did
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});