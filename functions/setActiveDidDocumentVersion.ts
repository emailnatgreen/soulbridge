import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { version_id } = await req.json();

    if (!version_id) {
      return Response.json(
        { error: 'Missing required field: version_id' },
        { status: 400 }
      );
    }

    // Get the version
    const version = await base44.entities.DidDocumentVersion.get(version_id);
    if (!version) {
      return Response.json({ error: 'Version not found' }, { status: 404 });
    }

    // Get wallet and verify ownership
    const wallet = await base44.entities.Wallet.get(version.wallet_id);
    if (!wallet || wallet.owner_id !== user.id) {
      return Response.json(
        { error: 'Not authorized to modify this DID' },
        { status: 403 }
      );
    }

    // Deactivate all other versions for this DID
    const allVersions = await base44.entities.DidDocumentVersion.filter({
      did_classic_address: version.did_classic_address
    });

    for (const v of allVersions) {
      if (v.id !== version_id && v.is_active) {
        await base44.entities.DidDocumentVersion.update(v.id, {
          is_active: false
        });
      }
    }

    // Activate the selected version
    const updatedVersion = await base44.entities.DidDocumentVersion.update(version_id, {
      is_active: true
    });

    return Response.json({
      success: true,
      version: updatedVersion
    });
  } catch (error) {
    console.error('Error setting active version:', error);
    return Response.json(
      { error: error.message || 'Failed to set active version' },
      { status: 500 }
    );
  }
});