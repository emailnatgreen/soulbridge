import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as xrpl from 'npm:xrpl@3.1.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { proposal_id, signer_seed, signer_name } = await req.json();

  if (!proposal_id || !signer_seed || !signer_name) {
    return Response.json({ error: 'proposal_id, signer_seed, and signer_name are required' }, { status: 400 });
  }

  // Validate signer is one of the 4 authorised quorum addresses
  const VALID_SIGNERS = new Set([
    'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia',
    'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7',
    'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV',
    'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',
  ]);

  // Derive wallet from seed
  let signerWallet;
  try {
    signerWallet = xrpl.Wallet.fromSeed(signer_seed);
  } catch (e) {
    return Response.json({ error: 'Invalid seed — could not derive wallet' }, { status: 400 });
  }

  if (!VALID_SIGNERS.has(signerWallet.classicAddress)) {
    return Response.json({
      error: 'This wallet is not a registered quorum signer',
      address: signerWallet.classicAddress,
    }, { status: 403 });
  }

  // Fetch the proposal
  const proposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ id: proposal_id });
  const proposal = proposals?.[0];
  if (!proposal) return Response.json({ error: 'Proposal not found' }, { status: 404 });
  if (proposal.proposal_type !== 'treasury_allocation') {
    return Response.json({ error: 'Not a treasury_allocation proposal' }, { status: 400 });
  }
  if (!['passed', 'active'].includes(proposal.status)) {
    return Response.json({ error: `Proposal status "${proposal.status}" cannot be signed` }, { status: 400 });
  }

  const action = proposal.action_data;
  const amountDrops = String(Math.floor(action.amount_xrp * 1_000_000));

  // Connect to XRPL mainnet
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();

  try {
    // Build and autofill the payment transaction
    const tx = await client.autofill({
      TransactionType: 'Payment',
      Account: action.treasury_address,
      Destination: action.recipient_address,
      Amount: amountDrops,
      Fee: '12',
    });

    // Sign as a multi-signer (not the master key of the account)
    const { tx_blob } = signerWallet.sign(tx, true); // true = multi-sign mode

    // Save this signature blob into the proposal's multisig_signatures array
    const existingSigs = (action.multisig_signatures || []).filter(
      s => s.signer_address !== signerWallet.classicAddress
    );
    const updatedSigs = [
      ...existingSigs,
      {
        signer_address: signerWallet.classicAddress,
        signer_name: signer_name,
        signed_at: new Date().toISOString(),
        tx_blob,
      },
    ];

    await base44.asServiceRole.entities.GovernanceProposal.update(proposal.id, {
      action_data: {
        ...action,
        multisig_signatures: updatedSigs,
      },
    });

    return Response.json({
      success: true,
      signer_address: signerWallet.classicAddress,
      signer_name,
      tx_blob,
      total_signatures: updatedSigs.length,
      message: `Signature from ${signer_name} saved to proposal`,
    });

  } catch (error) {
    console.error('generateMultiSigBlob error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    await client.disconnect();
  }
});