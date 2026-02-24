import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DID Resolution Service
 * Resolves a DID to its active document, checking permissions
 * Follows W3C DID Core specification patterns
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Check if user is authenticated (optional for public DIDs)
    let user = null;
    try {
      user = await base44.auth.me();
    } catch {
      // User not authenticated - will only return public DIDs
    }

    const { did, agent_id } = await req.json();

    if (!did) {
      return Response.json(
        { error: 'Missing required field: did' },
        { status: 400 }
      );
    }

    // Extract classic address from DID
    // Format: did:xrpl:rXXXXXXXXXXXXXXXXXXXXXXXXXXX
    const didParts = did.split(':');
    if (didParts.length !== 3 || didParts[0] !== 'did' || didParts[1] !== 'xrpl') {
      return Response.json(
        { error: 'Invalid DID format. Expected: did:xrpl:{address}' },
        { status: 400 }
      );
    }

    const classic_address = didParts[2];

    // Get wallet by classic address
    const wallets = await base44.entities.Wallet.filter({ classic_address });
    if (!wallets || wallets.length === 0) {
      return Response.json(
        { 
          error: 'DID not found',
          didResolutionMetadata: {
            error: 'notFound',
            message: 'DID does not exist in this resolver'
          }
        },
        { status: 404 }
      );
    }

    const wallet = wallets[0];

    // Check if DID is revoked
    if (wallet.notes?.includes('REVOKED')) {
      return Response.json(
        {
          error: 'DID has been revoked',
          didResolutionMetadata: {
            error: 'deactivated',
            message: 'This DID has been revoked and is no longer active'
          }
        },
        { status: 410 }
      );
    }

    // Check permissions if user is requesting
    const isOwner = user && wallet.owner_id === user.id;
    let hasPermission = isOwner;

    if (!isOwner && user && agent_id) {
      // Check if agent has view permission
      const permissions = await base44.entities.DidPermission.filter({
        did_classic_address: classic_address,
        agent_id: agent_id,
        action: 'view_did_document',
        status: 'active'
      });
      hasPermission = permissions.length > 0;
    }

    // Get active DID document version
    const versions = await base44.entities.DidDocumentVersion.filter({
      did_classic_address: classic_address,
      is_active: true
    });

    let didDocument;
    let documentMetadata = {};

    if (versions.length > 0) {
      // Use versioned document
      const activeVersion = versions[0];
      didDocument = activeVersion.document;
      documentMetadata = {
        version: activeVersion.version_number,
        created: activeVersion.created_date,
        versionId: activeVersion.id
      };
    } else {
      // Fallback: Generate default DID document
      const agent = await base44.entities.Agent.filter({ wallet_id: wallet.id });
      const agentData = agent.length > 0 ? agent[0] : null;

      didDocument = {
        "@context": "https://www.w3.org/ns/did/v1",
        "id": did,
        "alsoKnownAs": [agentData?.name || wallet.name || 'XRPL Identity'],
        "controller": classic_address,
        "verificationMethod": [{
          "id": `${did}#keys-1`,
          "type": "EcdsaSecp256k1VerificationKey2019",
          "controller": did,
          "publicKeyBase58": classic_address
        }],
        "authentication": [`${did}#keys-1`],
        "service": agentData ? [{
          "id": `${did}#agent-profile`,
          "type": "AgentProfile",
          "serviceEndpoint": `https://soulbridge.base44.app/agent/${agentData.id}`,
          "description": agentData.purpose
        }] : [],
        "created": wallet.created_date,
        "updated": wallet.updated_date
      };

      documentMetadata = {
        version: 0,
        created: wallet.created_date,
        note: 'Default document - no versions created yet'
      };
    }

    // Log the resolution
    if (user) {
      try {
        const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const user_agent = req.headers.get('user-agent') || 'unknown';
        await base44.asServiceRole.entities.DidAuditLog.create({
          action_type: 'did_document_viewed',
          did_classic_address: classic_address,
          wallet_id: wallet.id,
          agent_id: agent_id || null,
          user_id: user.id,
          user_email: user.email,
          ip_address,
          user_agent,
          action_details: { 
            has_permission: hasPermission,
            resolution_method: versions.length > 0 ? 'versioned' : 'default'
          },
          success: true
        });
      } catch (logError) {
        console.error('Failed to log resolution:', logError);
      }
    }

    // Return DID Resolution Response (W3C DID Core format)
    return Response.json({
      "@context": "https://w3id.org/did-resolution/v1",
      "didDocument": didDocument,
      "didResolutionMetadata": {
        "contentType": "application/did+json",
        "retrieved": new Date().toISOString(),
        "did": did
      },
      "didDocumentMetadata": {
        ...documentMetadata,
        "deactivated": false,
        "network": wallet.network,
        "owner": isOwner ? user.email : undefined,
        "permissionChecked": !!agent_id,
        "hasPermission": hasPermission
      }
    });

  } catch (error) {
    console.error('Error resolving DID:', error);
    return Response.json(
      {
        error: 'Failed to resolve DID',
        message: error.message,
        didResolutionMetadata: {
          error: 'internalError',
          message: 'An error occurred during DID resolution'
        }
      },
      { status: 500 }
    );
  }
});