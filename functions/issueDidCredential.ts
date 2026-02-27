import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { recipient_did, credential_type, credential_name, credential_data = {} } = payload;

    if (!recipient_did || !credential_type || !credential_name) {
      return Response.json({
        error: 'Missing required fields: recipient_did, credential_type, credential_name',
      }, { status: 400 });
    }

    // Get issuer's wallet/DID
    const issuerWallets = await base44.asServiceRole.entities.Wallet.filter({
      owner_id: user.id,
    });

    if (issuerWallets.length === 0) {
      return Response.json({
        error: 'Issuer has no wallet/DID configured',
      }, { status: 400 });
    }

    const issuerWallet = issuerWallets[0];
    const issuerDid = issuerWallet.classic_address ? `did:xrpl:${issuerWallet.classic_address}` : null;

    if (!issuerDid) {
      return Response.json({
        error: 'Issuer wallet has no classic address',
      }, { status: 400 });
    }

    // Create proof (simplified - in production, use cryptographic signing)
    const proofValue = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${issuerDid}${recipient_did}${Date.now()}`)
    );
    const proofHex = Array.from(new Uint8Array(proofValue))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Create credential
    const credential = {
      issuer_did: issuerDid,
      issuer_wallet_id: issuerWallet.id,
      subject_did: recipient_did,
      subject_wallet_id: null, // Will be linked via DID resolution
      credential_type,
      credential_name,
      credential_data,
      proof: {
        type: 'RsaSignature2018',
        created: new Date().toISOString(),
        verification_method: `${issuerDid}#keys-1`,
        proof_value: proofHex,
      },
      issuance_date: new Date().toISOString(),
      status: 'active',
      is_verified: true,
      verification_count: 0,
      visibility: 'private',
      metadata: {
        issued_by_user: user.email,
        issued_at_ip: req.headers.get('x-forwarded-for') || 'unknown',
      },
    };

    // Try to resolve subject wallet
    try {
      const subjectWallets = await base44.asServiceRole.entities.Wallet.filter({
        classic_address: recipient_did.replace('did:xrpl:', ''),
      });
      if (subjectWallets.length > 0) {
        credential.subject_wallet_id = subjectWallets[0].id;
      }
    } catch (e) {
      // Silently continue if subject wallet not found
    }

    const created = await base44.asServiceRole.entities.DidCredential.create(credential);

    // Log to audit trail
    await base44.asServiceRole.entities.DidAuditLog.create({
      action_type: 'credential_issued',
      did_classic_address: issuerWallet.classic_address,
      wallet_id: issuerWallet.id,
      user_id: user.id,
      user_email: user.email,
      ip_address: req.headers.get('x-forwarded-for') || 'unknown',
      action_details: {
        credential_type,
        recipient_did,
        credential_id: created.id,
      },
      success: true,
    });

    return Response.json({
      success: true,
      credential: created,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});