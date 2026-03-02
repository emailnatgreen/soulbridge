import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { agent_id } = payload;

    // Verify user has access to this agent
    const agent = await base44.entities.Agent.filter({ id: agent_id }, '', 1);
    if (!agent || agent.length === 0) {
      return Response.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Check liveness status - should have been verified before this call
    if (!agent[0].liveness_status || agent[0].liveness_status !== 'verified') {
      return Response.json({ 
        error: 'Behavioral Liveness Check required before minting Self-NFT' 
      }, { status: 400 });
    }

    // Generate Lumera ZK-Proof IPFS URI (placeholder)
    const ipfsUri = `ipfs://QmLumera${agent_id.slice(0, 8)}${Date.now()}`;

    // Create SelfNFT record
    const selfNft = await base44.entities.SelfNFT.create({
      owner_agent_id: agent_id,
      ipfs_uri: ipfsUri,
      status: 'active',
      mint_date: new Date().toISOString(),
      honor_snapshot: agent[0].honor_score || 100,
      liveness_verified: true,
      liveness_check_date: new Date().toISOString(),
      metadata: {
        visual_metadata: `/api/nft-visual/${agent_id}`,
        luminosity_score: Math.min(100, (agent[0].honor_score || 100) * 0.95)
      }
    });

    return Response.json({
      success: true,
      self_nft: selfNft,
      message: 'Self-NFT minted successfully. Ready for vaulting.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});