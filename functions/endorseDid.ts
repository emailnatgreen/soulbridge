import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Create an endorsement for another DID
 * Builds trust network between identities
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      endorsed_did, 
      endorsement_type = 'general', 
      rating, 
      comment = '', 
      tags = [],
      is_public = true 
    } = await req.json();

    if (!endorsed_did || !rating) {
      return Response.json(
        { error: 'Missing required fields: endorsed_did, rating' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return Response.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    // Get endorser's wallet
    const endorserWallets = await base44.entities.Wallet.filter({ owner_id: user.id });
    if (endorserWallets.length === 0) {
      return Response.json(
        { error: 'No wallet found. Create a DID first.' },
        { status: 404 }
      );
    }

    const endorserWallet = endorserWallets[0];
    const endorser_did = `did:xrpl:${endorserWallet.classic_address}`;

    // Can't endorse yourself
    if (endorser_did === endorsed_did) {
      return Response.json(
        { error: 'Cannot endorse your own DID' },
        { status: 400 }
      );
    }

    // Get endorsed wallet
    const endorsedAddress = endorsed_did.split(':')[2];
    const endorsedWallets = await base44.entities.Wallet.filter({ classic_address: endorsedAddress });
    if (endorsedWallets.length === 0) {
      return Response.json(
        { error: 'Endorsed DID not found' },
        { status: 404 }
      );
    }

    const endorsedWallet = endorsedWallets[0];

    // Check if endorsement already exists
    const existingEndorsements = await base44.entities.DidEndorsement.filter({
      endorser_did,
      endorsed_did
    });

    // Calculate relationship strength based on interactions
    const messages = await base44.entities.DidMessage.filter({ from_did: endorser_did, to_did: endorsed_did });
    const reverseMessages = await base44.entities.DidMessage.filter({ from_did: endorsed_did, to_did: endorser_did });
    const totalInteractions = messages.length + reverseMessages.length;

    let relationship_strength = 'weak';
    if (totalInteractions > 20) relationship_strength = 'strong';
    else if (totalInteractions > 5) relationship_strength = 'moderate';

    const endorsementData = {
      endorser_did,
      endorsed_did,
      endorser_wallet_id: endorserWallet.id,
      endorsed_wallet_id: endorsedWallet.id,
      endorsement_type,
      rating,
      comment,
      tags,
      is_public,
      verified: true,
      relationship_strength
    };

    let endorsement;
    if (existingEndorsements.length > 0) {
      // Update existing endorsement
      endorsement = await base44.asServiceRole.entities.DidEndorsement.update(
        existingEndorsements[0].id,
        endorsementData
      );
    } else {
      // Create new endorsement
      endorsement = await base44.asServiceRole.entities.DidEndorsement.create(endorsementData);
    }

    // Log the endorsement
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'did_verified',
        did_classic_address: endorserWallet.classic_address,
        wallet_id: endorserWallet.id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: { 
          action: 'endorsement_created',
          endorsed_did,
          endorsement_type,
          rating
        },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log endorsement:', logError);
    }

    return Response.json({
      success: true,
      endorsement,
      message: existingEndorsements.length > 0 ? 'Endorsement updated' : 'Endorsement created'
    });

  } catch (error) {
    console.error('Error creating endorsement:', error);
    return Response.json(
      { error: 'Failed to create endorsement', message: error.message },
      { status: 500 }
    );
  }
});