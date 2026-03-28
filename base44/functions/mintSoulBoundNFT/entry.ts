import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import * as xrpl from 'npm:xrpl@4.1.0';

/**
 * Mint Soul-Bound NFT
 * Mints a non-transferable (soul-bound) NFT on XRPL for an agent
 * and records it in the AgentNFT entity. Also updates the agent's
 * honor_score based on the badge type.
 *
 * Payload:
 *   agent_id: string (required)
 *   nft_type: string (required) — must match AgentNFT.nft_type enum
 *   badge_name: string (required)
 *   description: string
 *   related_entity_id: string (optional)
 *   related_entity_type: string (optional)
 *   ku_milestone: number (optional)
 *   image_url: string (optional)
 */

// Honor bonus awarded per badge type
const HONOR_BONUS = {
  kinetic_apprentice: 5,
  kinetic_trailblazer: 10,
  merit_forged: 8,
  task_sprinter: 6,
  civic_luminary: 12,
  founding_voice: 10,
  synergy_steward: 7,
  echoes_of_soulbridge: 3,
  builders_badge: 8,
  governance_contributor: 10,
  soul_spark: 5,
  custom: 2,
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const db = base44.asServiceRole;

  try {
    const body = await req.json();
    const { agent_id, nft_type, badge_name, description, related_entity_id, related_entity_type, ku_milestone, image_url } = body;

    if (!agent_id || !nft_type || !badge_name) {
      return Response.json({ error: 'agent_id, nft_type, and badge_name are required' }, { status: 400 });
    }

    // Fetch agent
    const agents = await db.entities.Agent.filter({ id: agent_id }, '-created_date', 1);
    const agent = Array.isArray(agents) ? agents[0] : null;
    if (!agent) {
      return Response.json({ error: `Agent ${agent_id} not found` }, { status: 404 });
    }

    // Check for duplicate badge of same type for this agent (idempotency)
    const existing = await db.entities.AgentNFT.filter({ agent_id, nft_type }, '-created_date', 1);
    if (Array.isArray(existing) && existing.length > 0) {
      return Response.json({
        status: 'skipped',
        reason: 'Agent already holds this badge type',
        existing_nft_id: existing[0].id,
      });
    }

    const now = new Date().toISOString();
    let xrpl_tx_hash = null;
    let xrpl_nft_token_id = null;
    let is_on_chain = false;

    // Attempt XRPL minting if agent has a classic address and seed is available
    const minterSeed = Deno.env.get('XRPL_SENDER_SEED');
    if (minterSeed && agent.classic_address) {
      try {
        const client = new xrpl.Client('wss://xrplcluster.com');
        await client.connect();

        const wallet = xrpl.Wallet.fromSeed(minterSeed);

        // Build NFT URI from metadata
        const uriData = JSON.stringify({
          badge: badge_name,
          type: nft_type,
          agent: agent.name,
          issued: now,
          description: description || '',
        });
        const uri = xrpl.convertStringToHex(uriData).toUpperCase();

        const mintTx = {
          TransactionType: 'NFTokenMint',
          Account: wallet.address,
          URI: uri,
          Flags: xrpl.NFTokenMintFlags.tfBurnable | xrpl.NFTokenMintFlags.tfTransferable === 0 ? 8 : 8, // tfBurnable only = soul-bound (non-transferable)
          TransferFee: 0,
          NFTokenTaxon: 0,
          Memos: [
            {
              Memo: {
                MemoData: xrpl.convertStringToHex(`SoulBridge:${nft_type}:${agent_id}`).toUpperCase(),
              },
            },
          ],
        };

        // Override Flags to tfBurnable (8) only — soul-bound means non-transferable
        mintTx.Flags = 8;

        const prepared = await client.autofill(mintTx);
        const signed = wallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        await client.disconnect();

        if (result.result.meta.TransactionResult === 'tesSUCCESS') {
          xrpl_tx_hash = result.result.hash;
          // Extract NFTokenID from metadata
          const nftNodes = result.result.meta?.AffectedNodes?.filter(
            n => n.CreatedNode?.LedgerEntryType === 'NFTokenPage' || n.ModifiedNode?.LedgerEntryType === 'NFTokenPage'
          );
          if (nftNodes && nftNodes.length > 0) {
            const finalFields = nftNodes[0].CreatedNode?.NewFields || nftNodes[0].ModifiedNode?.FinalFields;
            const tokens = finalFields?.NFTokens || [];
            const newest = tokens[tokens.length - 1];
            xrpl_nft_token_id = newest?.NFToken?.NFTokenID || null;
          }
          is_on_chain = true;
        }
      } catch (xrplErr) {
        // Log XRPL failure but continue — still create the off-chain record
        console.error('XRPL minting failed:', xrplErr.message);
      }
    }

    // Create AgentNFT record
    const nftRecord = await db.entities.AgentNFT.create({
      agent_id,
      nft_type,
      badge_name,
      description: description || '',
      image_url: image_url || null,
      ku_milestone: ku_milestone || null,
      related_entity_id: related_entity_id || null,
      related_entity_type: related_entity_type || null,
      xrpl_tx_hash,
      xrpl_nft_token_id,
      is_soul_bound: true,
      is_on_chain,
      status: is_on_chain ? 'minted' : (minterSeed ? 'failed' : 'pending'),
      metadata: { issued_at: now, agent_name: agent.name },
    });

    // Update agent honor_score
    const honorBonus = HONOR_BONUS[nft_type] || 2;
    const newHonor = Math.min((agent.honor_score || 100) + honorBonus, 200);
    await db.entities.Agent.update(agent_id, { honor_score: newHonor });

    // Log
    await db.entities.AutomationLog.create({
      automation_name: `MintNFT_${nft_type}`,
      function_name: 'mintSoulBoundNFT',
      status: 'success',
      message: `Minted ${badge_name} for ${agent.name} (on_chain: ${is_on_chain})`,
      details: { agent_id, nft_type, nft_id: nftRecord.id, xrpl_tx_hash, honor_bonus: honorBonus },
      run_at: now,
      triggered_by: 'agent',
    });

    return Response.json({
      status: 'success',
      nft_id: nftRecord.id,
      badge_name,
      nft_type,
      is_on_chain,
      xrpl_tx_hash,
      xrpl_nft_token_id,
      honor_bonus_applied: honorBonus,
      new_honor_score: newHonor,
      agent_name: agent.name,
    });

  } catch (error) {
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);
    await db.entities.AutomationLog.create({
      automation_name: 'MintNFT_Error',
      function_name: 'mintSoulBoundNFT',
      status: 'error',
      message: errMsg,
      error_detail: errMsg,
      run_at: new Date().toISOString(),
      triggered_by: 'agent',
    }).catch(() => {});
    return Response.json({ error: errMsg }, { status: 500 });
  }
});