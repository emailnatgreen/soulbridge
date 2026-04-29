import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Widget Ownership Check & Unlock Engine (Simulator-backed)
 * 
 * Single source of truth for "what this user can see and do."
 * 
 * Uses the XRPL Widget NFT Simulator ownership model (is_active flag).
 * Returns owned widgets with full metadata, unlocked feature_paths,
 * and a route map for dashboard rendering.
 * 
 * Accepts optional: { did: string } in payload
 * Returns: {
 *   owned_widgets: Widget[],
 *   unlocked_paths: string[],
 *   route_map: { [feature_path]: { unlocked, route, widget_name, nft_id } },
 *   all_widgets: WidgetSummary[],
 *   user_did: string | null
 * }
 */

// Maps feature_path to dashboard route
const FEATURE_ROUTE_MAP = {
  'wallet.multisig': '/dashboard',
  'wallet.custom_signatures': '/wallets',
  'wallet.trustlines': '/wallets',
  'wallet.publish_mainnet': '/DIDManager',
  'wallet.create': '/wallets',
  'wallet.node_setup': '/dashboard',
  'wallet.did_linking': '/SovereignID',
  '/ConstitutionalMultiSig': '/dashboard',
  '/NodeCovenant': '/dashboard',
  '/nft-workshop': '/nft-workshop',
  '/storefront': '/storefront',
  '/chrome-skills': '/dashboard',
  '/dex-swap': '/dashboard',
  '/rlusd-gate': '/rlusd-gate',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve user DID from payload or local identity
    let body = {};
    try { body = await req.json(); } catch (_) {}
    const userDid = body.did || null;

    // Fetch ALL widgets across all categories
    const allWidgets = await base44.asServiceRole.entities.Widget.list('name', 200);

    // Ownership check via simulator model (is_active flag)
    // In production XRPL mode, this will query NFTokens by DID/address
    const ownedWidgets = allWidgets.filter(w => w.is_active === true);
    const unlockedPaths = ownedWidgets
      .filter(w => w.feature_path)
      .map(w => w.feature_path);

    // Build route map — single source of truth for dashboard unlock state
    const routeMap = {};
    for (const w of allWidgets) {
      if (!w.feature_path) continue;
      const isOwned = w.is_active === true;
      routeMap[w.feature_path] = {
        unlocked: isOwned,
        route: FEATURE_ROUTE_MAP[w.feature_path] || null,
        widget_name: w.name,
        widget_description: w.description,
        nft_id: w.nft_id,
        widget_type: w.widget_type,
        widget_class: w.widget_class,
        category: w.category,
        ui_behavior: w.ui_behavior,
        image_url: w.image_url || null,
        deprecation_status: w.deprecation_status || 'none',
      };
    }

    // Audit log — record access check (non-blocking)
    try {
      await base44.asServiceRole.entities.AutomationLog.create({
        automation_name: 'Widget Unlock Engine',
        function_name: 'getOwnedWidgets',
        status: 'success',
        message: `Ownership check: ${ownedWidgets.length}/${allWidgets.length} owned`,
        details: {
          user_email: user.email,
          user_did: userDid,
          owned_count: ownedWidgets.length,
          total_count: allWidgets.length,
          unlocked_paths: unlockedPaths,
        },
        triggered_by: 'manual',
        run_at: new Date().toISOString(),
      });
    } catch (_auditErr) {
      // Audit logging is non-critical — don't block widget data
    }

    return Response.json({
      owned_widgets: ownedWidgets.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        widget_type: w.widget_type,
        widget_class: w.widget_class,
        category: w.category,
        nft_id: w.nft_id,
        version: w.version,
        feature_path: w.feature_path,
        ui_behavior: w.ui_behavior,
        image_url: w.image_url,
        minted_by: w.minted_by,
        deprecation_status: w.deprecation_status,
      })),
      unlocked_paths: unlockedPaths,
      route_map: routeMap,
      all_widgets: allWidgets.map(w => ({
        id: w.id,
        name: w.name,
        description: w.description,
        widget_type: w.widget_type,
        widget_class: w.widget_class,
        category: w.category,
        nft_id: w.nft_id,
        feature_path: w.feature_path,
        ui_behavior: w.ui_behavior,
        image_url: w.image_url,
        is_owned: w.is_active === true,
        deprecation_status: w.deprecation_status,
      })),
      user_did: userDid,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});