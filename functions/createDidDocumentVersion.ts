import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { wallet_id, document, changes_summary, set_as_active } = await req.json();

    if (!wallet_id || !document) {
      return Response.json(
        { error: 'Missing required fields: wallet_id, document' },
        { status: 400 }
      );
    }

    // Get wallet and verify ownership
    const wallet = await base44.entities.Wallet.get(wallet_id);
    if (!wallet) {
      return Response.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (wallet.owner_id !== user.id) {
      return Response.json(
        { error: 'You do not own this DID' },
        { status: 403 }
      );
    }

    // Get existing versions to determine next version number
    const existingVersions = await base44.entities.DidDocumentVersion.filter({
      did_classic_address: wallet.classic_address
    });

    const nextVersionNumber = existingVersions.length > 0
      ? Math.max(...existingVersions.map(v => v.version_number)) + 1
      : 1;

    // If setting as active, deactivate all other versions
    if (set_as_active) {
      for (const version of existingVersions.filter(v => v.is_active)) {
        await base44.entities.DidDocumentVersion.update(version.id, {
          is_active: false
        });
      }
    }

    // Create new version
    const newVersion = await base44.entities.DidDocumentVersion.create({
      did_classic_address: wallet.classic_address,
      wallet_id: wallet_id,
      version_number: nextVersionNumber,
      document: document,
      is_active: set_as_active || existingVersions.length === 0,
      changes_summary: changes_summary || `Version ${nextVersionNumber}`,
      created_by_user_id: user.id
    });

    // Log the version creation
    try {
      const ip_address = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const user_agent = req.headers.get('user-agent') || 'unknown';
      await base44.asServiceRole.entities.DidAuditLog.create({
        action_type: 'version_created',
        did_classic_address: wallet.classic_address,
        wallet_id: wallet_id,
        user_id: user.id,
        user_email: user.email,
        ip_address,
        user_agent,
        action_details: { version_number: nextVersionNumber, changes_summary, set_as_active },
        success: true
      });
    } catch (logError) {
      console.error('Failed to log version creation:', logError);
    }

    return Response.json({
      success: true,
      version: newVersion
    });
  } catch (error) {
    console.error('Error creating DID document version:', error);
    return Response.json(
      { error: error.message || 'Failed to create document version' },
      { status: 500 }
    );
  }
});