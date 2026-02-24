import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

/**
 * Verify a DID credential
 * Checks proof, expiration, and revocation status
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { credential_id } = await req.json();

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
        { 
          verified: false,
          error: 'Credential not found',
          status: 'not_found'
        },
        { status: 404 }
      );
    }

    const credential = credentials[0];
    const verificationResults = {
      verified: false,
      checks: {},
      issues: [],
      credential
    };

    // Check 1: Credential status
    if (credential.status === 'revoked') {
      verificationResults.checks.status = false;
      verificationResults.issues.push('Credential has been revoked');
    } else if (credential.status === 'suspended') {
      verificationResults.checks.status = false;
      verificationResults.issues.push('Credential is suspended');
    } else if (credential.status === 'expired') {
      verificationResults.checks.status = false;
      verificationResults.issues.push('Credential has expired');
    } else {
      verificationResults.checks.status = true;
    }

    // Check 2: Expiration date
    if (credential.expiration_date) {
      const now = new Date();
      const expirationDate = new Date(credential.expiration_date);
      if (now > expirationDate) {
        verificationResults.checks.expiration = false;
        verificationResults.issues.push('Credential has expired');
        
        // Update status to expired
        await base44.asServiceRole.entities.DidCredential.update(credential.id, {
          status: 'expired'
        });
      } else {
        verificationResults.checks.expiration = true;
      }
    } else {
      verificationResults.checks.expiration = true; // No expiration
    }

    // Check 3: Verify cryptographic proof
    try {
      const credentialPayload = {
        issuer_did: credential.issuer_did,
        subject_did: credential.subject_did,
        credential_type: credential.credential_type,
        credential_name: credential.credential_name,
        credential_data: credential.credential_data,
        issuance_date: credential.issuance_date
      };

      const computedProof = createHash('sha256')
        .update(JSON.stringify(credentialPayload))
        .digest('hex');

      if (computedProof === credential.proof?.proof_value) {
        verificationResults.checks.proof = true;
      } else {
        verificationResults.checks.proof = false;
        verificationResults.issues.push('Cryptographic proof verification failed');
      }
    } catch (proofError) {
      verificationResults.checks.proof = false;
      verificationResults.issues.push('Unable to verify proof');
    }

    // Check 4: Verify issuer DID exists and is not revoked
    try {
      const issuerAddress = credential.issuer_did.split(':')[2];
      const issuerWallets = await base44.entities.Wallet.filter({ classic_address: issuerAddress });
      
      if (issuerWallets.length === 0) {
        verificationResults.checks.issuer = false;
        verificationResults.issues.push('Issuer DID not found');
      } else if (issuerWallets[0].notes?.includes('REVOKED')) {
        verificationResults.checks.issuer = false;
        verificationResults.issues.push('Issuer DID has been revoked');
      } else {
        verificationResults.checks.issuer = true;
      }
    } catch (issuerError) {
      verificationResults.checks.issuer = false;
      verificationResults.issues.push('Unable to verify issuer');
    }

    // Overall verification result
    verificationResults.verified = 
      verificationResults.checks.status &&
      verificationResults.checks.expiration &&
      verificationResults.checks.proof &&
      verificationResults.checks.issuer;

    // Update verification count
    await base44.asServiceRole.entities.DidCredential.update(credential.id, {
      verification_count: (credential.verification_count || 0) + 1,
      last_verified: new Date().toISOString()
    });

    // Log verification attempt
    try {
      const user = await base44.auth.me();
      if (user) {
        const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const user_agent = req.headers.get('user-agent') || 'unknown';
        await base44.asServiceRole.entities.DidAuditLog.create({
          action_type: 'did_verified',
          did_classic_address: credential.issuer_did.split(':')[2],
          user_id: user.id,
          user_email: user.email,
          ip_address,
          user_agent,
          action_details: {
            action: 'credential_verified',
            credential_id,
            verified: verificationResults.verified,
            issues: verificationResults.issues
          },
          success: true
        });
      }
    } catch (logError) {
      console.error('Failed to log verification:', logError);
    }

    return Response.json({
      ...verificationResults,
      message: verificationResults.verified 
        ? 'Credential verified successfully' 
        : 'Credential verification failed'
    });

  } catch (error) {
    console.error('Error verifying credential:', error);
    return Response.json(
      { 
        verified: false,
        error: 'Failed to verify credential', 
        message: error.message 
      },
      { status: 500 }
    );
  }
});