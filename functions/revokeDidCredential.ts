import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Revoke a previously issued credential
 * Only the issuer can revoke their own credentials
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { credential_id, revocation_reason = 'Revoked by issuer' } = await req.json();

    if (!credential_id) {
      return Response.json(
        { error: 'Missing required field: credential_id' },
        { status: 400 }
      );
    }

    // Get credential
    const credentials = await base44.entities.DidCredential.filter({ id: credential_id });
    if (credentials.length === 0) {
      return Response.json(
        { error: 'Credential not found' },
        { status: 404 }
      );
    }

    const credential = credentials[0];

    // Get issuer's wallet
    const issuerWallets = await base44.entities.Wallet.filter({ owner_id: user.id });
    if (issuerWallets.length === 0) {
      return Response.json(
        { error: 'No wallet found' },
        { status: 404 }
      );
    }

    const issuerWallet = issuerWallets[0];
    const issuer_did = `did:xrpl:${issuerWallet.classic_address}`;

    // Verify user is the issuer
    if (credential.issuer_did !== issuer_did) {
      return Response.json(
        { error: 'Only the issuer can revoke this credential' },
        { status: 403 }
      );
    }

    // Revoke credential
    const updated = await base44.asServiceRole.entities.DidCredential.update(credential.id, {
      status: 'revoked',
      revocation_reason,
      revoked_at: new Date().toISOString()
    });

    // Log revocation
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'did_verified',
        did_classic_address: issuerWallet.classic_address,
        wallet_id: issuerWallet.id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: {
          action: 'credential_revoked',
          credential_id,
          subject_did: credential.subject_did,
          revocation_reason
        },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log revocation:', logError);
    }

    // Notify subject
    try {
      await base44.asServiceRole.entities.DidMessage.create({
        from_did: credential.issuer_did,
        to_did: credential.subject_did,
        from_wallet_id: credential.issuer_wallet_id,
        to_wallet_id: credential.subject_wallet_id,
        subject: `Credential Revoked: ${credential.credential_name}`,
        content: `Your credential "${credential.credential_name}" has been revoked by the issuer. Reason: ${revocation_reason}`,
        message_type: 'system',
        status: 'sent'
      });
    } catch (msgError) {
      console.error('Failed to send revocation notification:', msgError);
    }

    return Response.json({
      success: true,
      credential: updated,
      message: 'Credential revoked successfully'
    });

  } catch (error) {
    console.error('Error revoking credential:', error);
    return Response.json(
      { error: 'Failed to revoke credential', message: error.message },
      { status: 500 }
    );
  }
});