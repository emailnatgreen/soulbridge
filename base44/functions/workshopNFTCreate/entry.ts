/**
 * Workshop NFT Create — Charges RLUSD for NFT draft creation
 * 
 * Actions:
 *   POST { action: "price_check", nft_type }  — returns cost & balance
 *   POST { action: "create", nft_type, widget_data, agent_data? }  — charges RLUSD and creates entities
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Pricing per NFT type (in RLUSD)
// Infrastructure = 0 (admin-only, minted at cost for the platform)
const NFT_PRICING = {
  widget: 5,
  chrome_skill: 8,
  agent: 15,
  infrastructure: 0,
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, nft_type } = body;

    if (!action) return Response.json({ error: 'action required' }, { status: 400 });
    if (!nft_type || !(nft_type in NFT_PRICING)) {
      return Response.json({ error: `Invalid nft_type. Use: ${Object.keys(NFT_PRICING).join(', ')}` }, { status: 400 });
    }

    const cost = NFT_PRICING[nft_type];

    // Infrastructure NFTs are admin-only — reject non-admins
    if (nft_type === 'infrastructure' && user.role !== 'admin') {
      return Response.json({ error: 'Infrastructure NFTs are admin-only' }, { status: 403 });
    }

    // Get or create ledger
    const ledgers = await base44.asServiceRole.entities.RLUSDLedger.filter(
      { user_email: user.email }, '-created_date', 1
    );
    let ledger = ledgers?.[0];
    if (!ledger) {
      ledger = await base44.asServiceRole.entities.RLUSDLedger.create({
        user_id: user.email, user_email: user.email,
        balance: 0, total_credited: 0, total_debited: 0, status: 'active',
      });
    }

    // === PRICE CHECK ===
    if (action === 'price_check') {
      return Response.json({
        nft_type,
        cost,
        balance: ledger.balance,
        can_afford: ledger.balance >= cost,
        all_pricing: NFT_PRICING,
      });
    }

    // === CREATE ===
    if (action === 'create') {
      const { widget_data, agent_data, custom_data, metadata_standard_version, service_definition } = body;
      if (!widget_data) return Response.json({ error: 'widget_data required' }, { status: 400 });

      // Check balance
      if (ledger.balance < cost) {
        return Response.json({
          error: 'Insufficient RLUSD balance',
          balance: ledger.balance,
          required: cost,
        }, { status: 402 });
      }

      // Deduct balance
      const newBalance = ledger.balance - cost;
      await base44.asServiceRole.entities.RLUSDLedger.update(ledger.id, {
        balance: newBalance,
        total_debited: (ledger.total_debited || 0) + cost,
      });

      // Log payment
      try {
        await base44.asServiceRole.entities.PaymentUsageLog.create({
          user_id: user.email, user_email: user.email,
          service_id: `workshop_nft_${nft_type}`,
          amount: cost, currency: 'RLUSD',
          pricing_model: 'per_invocation',
          billing_behavior: 'prepay',
          status: 'success',
          balance_before: ledger.balance,
          balance_after: newBalance,
          metadata: { nft_type, widget_name: widget_data.name },
        });
      } catch (_) {}

      // Create widget entity — merge custom_data into metadata if provided
      const widgetPayload = {
        ...widget_data,
        minted_by: user.email,
        creator_id: user.email,
        mint_status: 'draft',
        metadata_version: metadata_standard_version || '2.0.0',
      };
      // Store custom_data in governance_notes as structured JSON (preserves extensibility)
      if (custom_data && typeof custom_data === 'object') {
        const existingNotes = widgetPayload.governance_notes || '';
        const metaEnvelope = {
          metadata_standard: `SoulBridgeNFTMetadata_v${metadata_standard_version || '2.0.0'}`,
          nft_type,
          custom_data,
        };
        widgetPayload.governance_notes = existingNotes
          ? `${existingNotes}\n---\n${JSON.stringify(metaEnvelope)}`
          : JSON.stringify(metaEnvelope);
      }
      const widget = await base44.asServiceRole.entities.Widget.create(widgetPayload);

      // For agent NFTs, also create the Agent entity
      let agent = null;
      if (nft_type === 'agent' && agent_data) {
        agent = await base44.asServiceRole.entities.Agent.create(agent_data);
        // Update widget with agent feature path (only if no explicit feature_path was set)
        if (!widget_data.feature_path) {
          await base44.asServiceRole.entities.Widget.update(widget.id, {
            feature_path: `/agents/${agent.id}`,
          });
        }
      }

      // Handle ServiceDefinition creation/linking for service-type NFTs
      let serviceDefinitionResult = null;
      if (service_definition) {
        if (typeof service_definition === 'object' && service_definition._new) {
          // Create a new ServiceDefinition
          const { _new, ...svcData } = service_definition;
          if (svcData.service_id && svcData.name) {
            serviceDefinitionResult = await base44.asServiceRole.entities.ServiceDefinition.create({
              ...svcData,
              widget_id: widget.id,
              widget_nft_id: widget_data.nft_id || widget.id,
              status: 'draft',
              version: '1.0.0',
            });
          }
        } else if (typeof service_definition === 'string') {
          // Link existing ServiceDefinition — update it to reference this widget
          try {
            await base44.asServiceRole.entities.ServiceDefinition.update(service_definition, {
              widget_id: widget.id,
              widget_nft_id: widget_data.nft_id || widget.id,
            });
            serviceDefinitionResult = { id: service_definition, linked: true };
          } catch (_) {}
        }
      }

      // Log to ServiceUsageLog
      try {
        await base44.asServiceRole.entities.ServiceUsageLog.create({
          service_id: `workshop_nft_${nft_type}`,
          user_did: user.email,
          user_email: user.email,
          invocation_type: 'execute',
          status: 'success',
          input_params: { nft_type, widget_name: widget_data.name },
          output_summary: { widget_id: widget.id, agent_id: agent?.id },
          cost_drops: 0,
        });
      } catch (_) {}

      return Response.json({
        success: true,
        nft_type,
        cost_charged: cost,
        balance_after: newBalance,
        widget,
        agent,
        service_definition: serviceDefinitionResult,
        custom_data: custom_data || null,
        metadata_standard_version: metadata_standard_version || '1.0.0',
        message: `${nft_type} NFT draft created — charged ${cost} RLUSD (Metadata v${metadata_standard_version || '2.0.0'})${serviceDefinitionResult ? ' + ServiceDefinition linked' : ''}`,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});