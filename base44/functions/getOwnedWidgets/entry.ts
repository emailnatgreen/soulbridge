import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Widget Ownership Check & Unlock Engine
 * 
 * Returns the user's owned widgets and which features are unlocked.
 * For now uses a simulated ownership model (Widget.is_active flag per user).
 * Will later be replaced with real XRPL NFT ownership checks.
 * 
 * Accepts optional: { did: string } in payload
 * Returns: { owned_widgets: Widget[], unlocked_paths: string[], all_widgets: Widget[] }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all wallet_management widgets
    const allWidgets = await base44.asServiceRole.entities.Widget.filter(
      { category: 'wallet_management' },
      'name',
      50
    );

    // Simulated ownership: check which widgets are "owned" by this user
    // In production, this will query XRPL NFTokens by DID/address
    // For now, we use is_active as a simulator flag
    const ownedWidgets = allWidgets.filter(w => w.is_active === true);
    const unlockedPaths = ownedWidgets
      .filter(w => w.feature_path)
      .map(w => w.feature_path);

    return Response.json({
      owned_widgets: ownedWidgets,
      unlocked_paths: unlockedPaths,
      all_widgets: allWidgets.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        widget_type: w.widget_type,
        category: w.category,
        nft_id: w.nft_id,
        feature_path: w.feature_path,
        ui_behavior: w.ui_behavior,
        image_url: w.image_url,
        is_owned: w.is_active === true,
        deprecation_status: w.deprecation_status,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});