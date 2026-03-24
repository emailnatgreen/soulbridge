import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { proof_id, verifier_address } = await req.json();

    if (!proof_id || !verifier_address) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the proof
    const proof = await base44.entities.ZKProof.filter({ id: proof_id }, 'created_date', 1);
    
    if (!proof || proof.length === 0) {
      return Response.json({ error: 'Proof not found' }, { status: 404 });
    }

    const zkProof = proof[0];

    // Check if proof is expired
    if (new Date() > new Date(zkProof.expires_at)) {
      return Response.json({ error: 'Proof has expired' }, { status: 400 });
    }

    // Check if verifier is authorized
    if (zkProof.verifier_addresses.length > 0 && !zkProof.verifier_addresses.includes(verifier_address)) {
      return Response.json({ error: 'Verifier not authorized for this proof' }, { status: 403 });
    }

    // Update verification count and last verified timestamp
    const updatedProof = await base44.entities.ZKProof.update(zkProof.id, {
      proof_status: 'verified',
      verification_count: (zkProof.verification_count || 0) + 1,
      last_verified_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      proof: updatedProof,
      message: 'Zero-knowledge proof verified successfully',
      claim_category: updatedProof.claim_category,
      verified: true
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});