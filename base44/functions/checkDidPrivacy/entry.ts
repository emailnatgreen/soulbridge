import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Check if a DID can access another DID's information
 * Enforces privacy settings and access control
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const {
      viewer_did,
      target_did,
      access_type // 'profile', 'messages', 'credentials', 'endorsements', 'reputation', 'activity', 'connections'
    } = await req.json();

    if (!target_did || !access_type) {
      return Response.json(
        { error: 'Missing required fields: target_did, access_type' },
        { status: 400 }
      );
    }

    // Get target's privacy settings
    const targetAddress = target_did.split(':')[2];
    const privacySettings = await base44.entities.DidPrivacySetting.filter({
      did_address: targetAddress
    });

    // Default to most permissive if no settings found
    if (privacySettings.length === 0) {
      return Response.json({
        allowed: true,
        reason: 'No privacy settings configured',
        level: 'public'
      });
    }

    const settings = privacySettings[0];

    // Check if viewer is blocked
    if (settings.blocked_dids?.includes(viewer_did)) {
      return Response.json({
        allowed: false,
        reason: 'Viewer is blocked by target DID',
        level: 'blocked'
      });
    }

    // Determine privacy setting for requested access type
    let privacySetting;
    switch (access_type) {
      case 'profile':
        privacySetting = settings.profile_visibility;
        break;
      case 'messages':
        privacySetting = settings.message_privacy;
        break;
      case 'credentials':
        privacySetting = settings.credential_visibility;
        break;
      case 'endorsements':
        privacySetting = settings.endorsement_visibility;
        break;
      case 'reputation':
        privacySetting = settings.reputation_visibility;
        break;
      case 'activity':
        privacySetting = settings.activity_visibility;
        break;
      case 'connections':
        privacySetting = settings.connection_list_visibility;
        break;
      default:
        return Response.json({
          allowed: false,
          reason: 'Invalid access type',
          level: 'invalid'
        });
    }

    // No viewer specified - check if public
    if (!viewer_did) {
      const allowed = privacySetting === 'public' || privacySetting === 'anyone';
      return Response.json({
        allowed,
        reason: allowed ? 'Public access' : 'Requires authentication',
        level: privacySetting
      });
    }

    // Check against privacy level
    if (privacySetting === 'public' || privacySetting === 'anyone') {
      return Response.json({
        allowed: true,
        reason: 'Public access',
        level: privacySetting
      });
    }

    if (privacySetting === 'private') {
      const allowed = viewer_did === target_did;
      return Response.json({
        allowed,
        reason: allowed ? 'Self access' : 'Private - owner only',
        level: 'private'
      });
    }

    // Check whitelist for restrictive settings
    if (privacySetting === 'whitelist_only') {
      const allowed = settings.whitelisted_dids?.includes(viewer_did);
      return Response.json({
        allowed,
        reason: allowed ? 'On whitelist' : 'Not on whitelist',
        level: 'whitelist_only'
      });
    }

    // Check if viewer is a connection (has endorsement or trust relationship)
    if (privacySetting === 'connections_only' || privacySetting === 'trusted_only') {
      const [endorsements, trustRelationships] = await Promise.all([
        base44.entities.DidEndorsement.filter({
          endorser_did: viewer_did,
          endorsed_did: target_did
        }),
        base44.entities.TrustRelationship.filter({
          trustor_did: viewer_did,
          trustee_did: target_did
        })
      ]);

      const isConnection = endorsements.length > 0 || trustRelationships.length > 0;

      if (privacySetting === 'connections_only') {
        return Response.json({
          allowed: isConnection,
          reason: isConnection ? 'Viewer is a connection' : 'Not a connection',
          level: 'connections_only'
        });
      }

      // For trusted_only, also check trust score
      if (privacySetting === 'trusted_only') {
        if (!isConnection) {
          return Response.json({
            allowed: false,
            reason: 'Not a connection',
            level: 'trusted_only'
          });
        }

        const isTrusted = trustRelationships.some(t => 
          t.calculated_trust_score >= 60 && t.status === 'active'
        );

        return Response.json({
          allowed: isTrusted,
          reason: isTrusted ? 'Trusted connection' : 'Trust score too low',
          level: 'trusted_only'
        });
      }
    }

    // Default deny
    return Response.json({
      allowed: false,
      reason: 'Privacy check failed',
      level: privacySetting
    });

  } catch (error) {
    console.error('Error checking privacy:', error);
    return Response.json(
      { error: 'Failed to check privacy', message: error.message },
      { status: 500 }
    );
  }
});