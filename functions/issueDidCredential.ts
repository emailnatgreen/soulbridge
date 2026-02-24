import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

/**
 * Issue a verifiable credential to another DID
 * Follows W3C Verifiable Credentials standards
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      subject_did,
      credential_type,
      credential_name,
      credential_data = {},
      expiration_date = null,
      visibility = 'private'
    } = await req.json();

    if (!subject_did || !credential_type || !credential_name) {
      return Response.json(
        { error: 'Missing required fields: subject_did, credential_type, credential_name' },
        { status: 400 }
      );
    }

    // Get issuer's wallet
    const issuerWallets = await base44.entities.Wallet.filter({ owner_id: user.id });
    if (issuerWallets.length === 0) {
      return Response.json(
        { error: 'No wallet found. Create a DID first.' },
        { status: 404 }
      );
    }

    const issuerWallet = issuerWallets[0];
    const issuer_did = `did:xrpl:${issuerWallet.classic_address}`;

    // Get subject wallet
    const subjectAddress = subject_did.split(':')[2];
    const subjectWallets = await base44.entities.Wallet.filter({ classic_address: subjectAddress });
    if (subjectWallets.length === 0) {
      return Response.json(
        { error: 'Subject DID not found' },
        { status: 404 }
      );
    }

    const subjectWallet = subjectWallets[0];

    // Can't issue to yourself (though this might be valid in some cases)
    if (issuer_did === subject_did) {
      return Response.json(
        { error: 'Cannot issue credential to your own DID' },
        { status: 400 }
      );
    }

    // Create credential proof
    const issuance_date = new Date().toISOString();
    const credentialPayload = {
      issuer_did,
      subject_did,
      credential_type,
      credential_name,
      credential_data,
      issuance_date
    };

    // Generate proof hash (simplified cryptographic proof)
    const proofValue = createHash('sha256')
      .update(JSON.stringify(credentialPayload))
      .digest('hex');

    const proof = {
      type: 'SHA256Hash',
      created: issuance_date,
      verification_method: `${issuer_did}#keys-1`,
      proof_value: proofValue
    };

    // Create credential
    const credential = await base44.asServiceRole.entities.DidCredential.create({
      issuer_did,
      subject_did,
      issuer_wallet_id: issuerWallet.id,
      subject_wallet_id: subjectWallet.id,
      credential_type,
      credential_name,
      credential_data,
      proof,
      issuance_date,
      expiration_date,
      status: 'active',
      is_verified: true,
      verification_count: 0,
      visibility,
      metadata: {
        issuer_name: issuerWallet.name,
        issued_by_user: user.email
      }
    });

    // Log the issuance
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
          action: 'credential_issued',
          subject_did,
          credential_type,
          credential_name
        },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log credential issuance:', logError);
    }

    // Send notification to subject (if messaging is available)
    try {
      await base44.asServiceRole.entities.DidMessage.create({
        from_did: issuer_did,
        to_did: subject_did,
        from_wallet_id: issuerWallet.id,
        to_wallet_id: subjectWallet.id,
        subject: `New Credential Issued: ${credential_name}`,
        content: `You have received a new credential of type "${credential_type}" from ${issuer_did}. Credential name: ${credential_name}`,
        message_type: 'verification_request',
        status: 'sent'
      });
    } catch (msgError) {
      console.error('Failed to send credential notification:', msgError);
    }

    return Response.json({
      success: true,
      credential,
      message: 'Credential issued successfully'
    });

  } catch (error) {
    console.error('Error issuing credential:', error);
    return Response.json(
      { error: 'Failed to issue credential', message: error.message },
      { status: 500 }
    );
  }
});