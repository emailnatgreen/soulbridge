import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { did_id, witness_nodes } = body;

    if (!did_id || !witness_nodes || witness_nodes.length !== 4) {
      return Response.json(
        { error: 'Invalid input: need did_id and 4 witness nodes' },
        { status: 400 }
      );
    }

    // Create or update the QuadShardDID
    const quadShardDID = await base44.asServiceRole.entities.QuadShardDID.create({
      did_id,
      status: 'Pending_Activation',
      witness_nodes: witness_nodes.map((node, idx) => ({
        node_name: node.name || `Witness_${idx + 1}`,
        did_address: node.address,
        status: idx === 0 ? 'active' : 'pending',
        verification_timestamp: new Date().toISOString()
      })),
      signatures_required: 4,
      signatures_collected: 1,
      framework: 'SoulBridge_AxiForge_1.0',
      verification_method: 'Multi-Sig_Consensus_Audit'
    });

    // Create governance proposal for activation
    const proposal = await base44.asServiceRole.entities.GovernanceProposal.create({
      title: `Activate Quad Shard DID: ${did_id}`,
      description: `Activation proposal for ${did_id} with 4-witness multi-sig consensus`,
      proposal_type: 'general',
      proposed_by: user.email,
      status: 'active',
      voting_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      action_data: { quad_shard_did_id: quadShardDID.id }
    });

    // Update DID with proposal reference
    await base44.asServiceRole.entities.QuadShardDID.update(quadShardDID.id, {
      activation_proposal_id: proposal.id
    });

    return Response.json({
      success: true,
      quadShardDID,
      proposal,
      message: 'Quad Shard DID activation initiated - awaiting witness signatures'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});