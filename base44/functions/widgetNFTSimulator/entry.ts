import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Widget NFT Simulator — XRPL Integration (Simulator Stage)
 * 
 * Simulates the full NFT lifecycle for Widget NFTs without touching mainnet.
 * Operations: mint, transfer, burn, lookup, metadata
 * 
 * XRPL NFT Structure Definition:
 * - NFTokenTaxon: 1001 (Widget class identifier)
 * - Issuer: Village Treasury (rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h)
 * - Flags: tfTransferable (8) — widgets can be traded
 * - TransferFee: 500 (5% royalty on secondary sales)
 * - URI: base64-encoded JSON metadata pointer
 * 
 * Metadata URI Pattern:
 *   ipfs://soulbridge/widgets/{nft_id}/metadata.json
 * 
 * On-chain metadata mapping:
 *   { nft_id, name, widget_type, widget_class, category,
 *     feature_path, ui_behavior, version, minted_by, issuer }
 */

const TAXON = 1001;
const ISSUER = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const TRANSFER_FEE = 500; // 5%
const FLAGS = 8; // tfTransferable

function generateSimulatedNFTokenID(nftId) {
  // Deterministic simulated token ID from widget nft_id
  const hex = Array.from(nftId).map(c => c.charCodeAt(0).toString(16)).join('');
  return `00080000${ISSUER.slice(0, 20)}${hex.padEnd(24, '0')}`.toUpperCase().slice(0, 64);
}

function buildMetadataURI(nftId) {
  return `ipfs://soulbridge/widgets/${nftId}/metadata.json`;
}

function buildOnChainMetadata(widget) {
  return {
    nft_id: widget.nft_id,
    name: widget.name,
    widget_type: widget.widget_type,
    widget_class: widget.widget_class,
    category: widget.category,
    feature_path: widget.feature_path,
    ui_behavior: widget.ui_behavior,
    version: widget.version,
    minted_by: widget.minted_by,
    issuer: ISSUER,
    taxon: TAXON,
    transfer_fee: TRANSFER_FEE,
    flags: FLAGS,
    uri: buildMetadataURI(widget.nft_id),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, nft_id, target_did } = body;

    if (!action) {
      return Response.json({ error: 'action is required (mint, transfer, burn, lookup, metadata)' }, { status: 400 });
    }

    // Fetch the widget by nft_id
    const widgets = nft_id
      ? await base44.asServiceRole.entities.Widget.filter({ nft_id })
      : [];
    const widget = widgets[0] || null;

    switch (action) {

      // ── MINT ───────────────────────────────────────────────────────────
      case 'mint': {
        if (!widget) return Response.json({ error: `Widget ${nft_id} not found` }, { status: 404 });
        if (widget.is_active) return Response.json({ error: `Widget ${nft_id} is already minted/active` }, { status: 409 });

        const tokenId = generateSimulatedNFTokenID(nft_id);
        const metadata = buildOnChainMetadata(widget);

        // Simulate minting by activating the widget
        await base44.asServiceRole.entities.Widget.update(widget.id, {
          is_active: true,
        });

        // Log the simulated mint
        await base44.asServiceRole.entities.AutomationLog.create({
          automation_name: 'Widget NFT Simulator',
          function_name: 'widgetNFTSimulator',
          status: 'success',
          message: `Simulated MINT of ${nft_id} → NFTokenID: ${tokenId}`,
          details: {
            action: 'mint',
            nft_id,
            simulated_token_id: tokenId,
            issuer: ISSUER,
            taxon: TAXON,
            metadata_uri: metadata.uri,
            owner_did: target_did || `did:xrpl:1:${ISSUER}`,
          },
          triggered_by: 'manual',
          run_at: new Date().toISOString(),
        });

        return Response.json({
          success: true,
          action: 'mint',
          simulated_tx: {
            type: 'NFTokenMint',
            nft_token_id: tokenId,
            issuer: ISSUER,
            taxon: TAXON,
            transfer_fee: TRANSFER_FEE,
            flags: FLAGS,
            uri: metadata.uri,
          },
          metadata,
          widget_id: widget.id,
        });
      }

      // ── TRANSFER ───────────────────────────────────────────────────────
      case 'transfer': {
        if (!widget) return Response.json({ error: `Widget ${nft_id} not found` }, { status: 404 });
        if (!widget.is_active) return Response.json({ error: `Widget ${nft_id} is not minted — cannot transfer` }, { status: 400 });
        if (!target_did) return Response.json({ error: 'target_did is required for transfer' }, { status: 400 });

        // Log the simulated transfer (ownership model stays the same for now)
        await base44.asServiceRole.entities.AutomationLog.create({
          automation_name: 'Widget NFT Simulator',
          function_name: 'widgetNFTSimulator',
          status: 'success',
          message: `Simulated TRANSFER of ${nft_id} → ${target_did}`,
          details: {
            action: 'transfer',
            nft_id,
            simulated_token_id: generateSimulatedNFTokenID(nft_id),
            new_owner_did: target_did,
            previous_owner: ISSUER,
          },
          triggered_by: 'manual',
          run_at: new Date().toISOString(),
        });

        return Response.json({
          success: true,
          action: 'transfer',
          simulated_tx: {
            type: 'NFTokenCreateOffer + NFTokenAcceptOffer',
            nft_token_id: generateSimulatedNFTokenID(nft_id),
            from: ISSUER,
            to: target_did,
            transfer_fee_applied: `${TRANSFER_FEE / 100}%`,
          },
          nft_id,
          new_owner: target_did,
        });
      }

      // ── BURN ───────────────────────────────────────────────────────────
      case 'burn': {
        if (!widget) return Response.json({ error: `Widget ${nft_id} not found` }, { status: 404 });
        if (!widget.is_active) return Response.json({ error: `Widget ${nft_id} is not active — nothing to burn` }, { status: 400 });

        // Simulate burning by deactivating
        await base44.asServiceRole.entities.Widget.update(widget.id, {
          is_active: false,
        });

        await base44.asServiceRole.entities.AutomationLog.create({
          automation_name: 'Widget NFT Simulator',
          function_name: 'widgetNFTSimulator',
          status: 'success',
          message: `Simulated BURN of ${nft_id} — feature re-locked`,
          details: {
            action: 'burn',
            nft_id,
            simulated_token_id: generateSimulatedNFTokenID(nft_id),
            feature_relocked: widget.feature_path,
          },
          triggered_by: 'manual',
          run_at: new Date().toISOString(),
        });

        return Response.json({
          success: true,
          action: 'burn',
          simulated_tx: {
            type: 'NFTokenBurn',
            nft_token_id: generateSimulatedNFTokenID(nft_id),
            feature_relocked: widget.feature_path,
          },
          nft_id,
        });
      }

      // ── LOOKUP ─────────────────────────────────────────────────────────
      case 'lookup': {
        // Return all widgets with their simulated on-chain state
        const allWidgets = await base44.asServiceRole.entities.Widget.filter(
          { category: 'wallet_management' }, 'name', 50
        );

        const ledgerState = allWidgets.map(w => ({
          nft_id: w.nft_id,
          name: w.name,
          simulated_token_id: generateSimulatedNFTokenID(w.nft_id),
          is_minted: w.is_active === true,
          feature_path: w.feature_path,
          issuer: ISSUER,
          taxon: TAXON,
          uri: buildMetadataURI(w.nft_id),
        }));

        return Response.json({
          success: true,
          action: 'lookup',
          issuer: ISSUER,
          taxon: TAXON,
          total_widgets: allWidgets.length,
          minted: allWidgets.filter(w => w.is_active).length,
          unminted: allWidgets.filter(w => !w.is_active).length,
          ledger_state: ledgerState,
        });
      }

      // ── METADATA ───────────────────────────────────────────────────────
      case 'metadata': {
        if (!widget) return Response.json({ error: `Widget ${nft_id} not found` }, { status: 404 });
        return Response.json({
          success: true,
          action: 'metadata',
          on_chain_metadata: buildOnChainMetadata(widget),
          xrpl_structure: {
            NFTokenTaxon: TAXON,
            Issuer: ISSUER,
            TransferFee: TRANSFER_FEE,
            Flags: FLAGS,
            URI_pattern: 'ipfs://soulbridge/widgets/{nft_id}/metadata.json',
            naming_convention: 'WIDGET-{CATEGORY_CODE}-{SEQUENCE}',
          },
        });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}. Use: mint, transfer, burn, lookup, metadata` }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});