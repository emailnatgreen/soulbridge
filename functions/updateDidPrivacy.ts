import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Update DID privacy settings
 * Only the DID owner can update their settings
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { settings } = await req.json();

    if (!settings) {
      return Response.json(
        { error: 'Missing required field: settings' },
        { status: 400 }
      );
    }

    // Get user's wallet
    const wallets = await base44.entities.Wallet.filter({ owner_id: user.id });
    if (wallets.length === 0) {
      return Response.json(
        { error: 'No wallet found' },
        { status: 404 }
      );
    }

    const wallet = wallets[0];
    const did_address = wallet.classic_address;

    // Check for existing settings
    const existingSettings = await base44.entities.DidPrivacySetting.filter({
      did_address
    });

    const privacyData = {
      did_address,
      wallet_id: wallet.id,
      ...settings
    };

    let result;
    if (existingSettings.length > 0) {
      result = await base44.asServiceRole.entities.DidPrivacySetting.update(
        existingSettings[0].id,
        privacyData
      );
    } else {
      result = await base44.asServiceRole.entities.DidPrivacySetting.create(privacyData);
    }

    // Log the update
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'did_document_viewed',
        did_classic_address: did_address,
        wallet_id: wallet.id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: {
          action: 'privacy_settings_updated',
          changes: settings
        },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log privacy update:', logError);
    }

    return Response.json({
      success: true,
      settings: result,
      message: 'Privacy settings updated'
    });

  } catch (error) {
    console.error('Error updating privacy:', error);
    return Response.json(
      { error: 'Failed to update privacy settings', message: error.message },
      { status: 500 }
    );
  }
});