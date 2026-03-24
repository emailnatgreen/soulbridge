import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      agent_id,
      attestation_type,
      scope,
      privacy_guarantees = [],
      associated_zkproofs = [],
      expires_in_days = 365
    } = await req.json();

    if (!agent_id || !attestation_type || !scope) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify user is authorized to issue attestations (admin or compliance role)
    const issuer = await base44.auth.me();
    if (issuer?.role !== 'admin') {
      return Response.json({ error: 'Only admins can issue attestations' }, { status: 403 });
    }

    const expiresAt = new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString();
    const verificationHash = `0x${Buffer.from(`${agent_id}:${attestation_type}:${Date.now()}`).toString('hex')}`;
    const simulatedTxId = `ATT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create PrivacyAttestation record
    const attestation = await base44.entities.PrivacyAttestation.create({
      agent_id,
      attestation_type,
      issuing_authority: issuer.email || 'SoulBridge Compliance Authority',
      scope,
      status: 'active',
      issued_at: new Date().toISOString(),
      expires_at: expiresAt,
      verification_hash: verificationHash,
      xrpl_txid: simulatedTxId,
      privacy_guarantees,
      associated_zkproofs
    });

    return Response.json({
      success: true,
      attestation,
      message: `Privacy attestation issued for agent: ${agent_id}`,
      expires_at: expiresAt,
      verification_hash: verificationHash
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});