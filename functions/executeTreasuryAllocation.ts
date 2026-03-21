import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as xrpl from 'npm:xrpl@3.1.0';

const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';
const QUORUM = 2;
const VALID_SIGNERS = new Set([
  'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', // Nathan (Human Node)
  'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', // Lore Node
  'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', // Truth Node
  'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  // DID IT Node
]);

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Admin only
  const user = await base44.auth.me();
  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  const { proposal_id } = await req.json();
  if (!proposal_id) {
    return Response.json({ error: 'proposal_id is required' }, { status: 400 });
  }

  // Fetch the proposal
  const proposals = await base44.asServiceRole.entities.GovernanceProposal.filter({ id: proposal_id });
  const proposal = proposals?.[0];

  if (!proposal) {
    return Response.json({ error: 'Proposal not found' }, { status: 404 });
  }

  // Validate proposal type and status
  if (proposal.proposal_type !== 'treasury_allocation') {
    return Response.json({ error: 'Proposal is not a treasury_allocation type' }, { status: 400 });
  }
  if (proposal.status !== 'passed') {
    return Response.json({ error: `Proposal status is "${proposal.status}" — must be "passed" to execute` }, { status: 400 });
  }
  if (proposal.execution_result?.executed) {
    return Response.json({ error: 'Proposal has already been executed' }, { status: 400 });
  }

  const action = proposal.action_data;
  if (!action?.recipient_address || !action?.amount_xrp) {
    return Response.json({ error: 'Proposal action_data is missing recipient_address or amount_xrp' }, { status: 400 });
  }

  // Validate multi-sig signatures
  const signatures = (action.multisig_signatures || []).filter(
    s => s?.signer_address && VALID_SIGNERS.has(s.signer_address) && s?.tx_blob
  );

  // Deduplicate by signer address
  const uniqueSigners = [...new Map(signatures.map(s => [s.signer_address, s])).values()];

  if (uniqueSigners.length < QUORUM) {
    return Response.json({
      error: `Insufficient signatures: ${uniqueSigners.length} of ${QUORUM} required`,
      collected_signers: uniqueSigners.map(s => s.signer_address),
      quorum_required: QUORUM,
    }, { status: 400 });
  }

  // Connect to XRPL mainnet
  const client = new xrpl.Client('wss://xrplcluster.com');
  await client.connect();

  try {
    const amountDrops = String(Math.floor(action.amount_xrp * 1_000_000));

    // Build the base Payment transaction
    const baseTx = {
      TransactionType: 'Payment',
      Account: TREASURY_ADDRESS,
      Destination: action.recipient_address,
      Amount: amountDrops,
      Fee: '12',
    };

    // Autofill sequence and ledger fields
    const prepared = await client.autofill(baseTx);

    // Combine multi-sig blobs from the quorum signers (use first QUORUM valid ones)
    const signerBlobs = uniqueSigners.slice(0, QUORUM).map(s => s.tx_blob);

    // Combine signatures into a multi-signed transaction
    const multiSigned = xrpl.multisign(signerBlobs);

    // Submit the multi-signed transaction
    const result = await client.submitAndWait(multiSigned);
    const txResult = result.result.meta?.TransactionResult;
    const success = txResult === 'tesSUCCESS';

    // Update proposal with execution result
    await base44.asServiceRole.entities.GovernanceProposal.update(proposal.id, {
      status: success ? 'executed' : proposal.status,
      execution_result: {
        executed: success,
        tx_hash: result.result.hash,
        ledger_index: result.result.ledger_index,
        transaction_result: txResult,
        executed_at: new Date().toISOString(),
        executed_by: user.email,
        amount_xrp: action.amount_xrp,
        recipient_address: action.recipient_address,
      },
      action_data: {
        ...action,
        execution_tx_hash: result.result.hash,
      },
    });

    // Log to AutomationLog
    await base44.asServiceRole.entities.AutomationLog.create({
      automation_name: 'Treasury Allocation Execution',
      function_name: 'executeTreasuryAllocation',
      status: success ? 'success' : 'error',
      message: success
        ? `Transferred ${action.amount_xrp} XRP to ${action.recipient_name || action.recipient_address}`
        : `Execution failed: ${txResult}`,
      details: {
        proposal_id: proposal.id,
        treasury_address: TREASURY_ADDRESS,
        recipient_address: action.recipient_address,
        amount_xrp: action.amount_xrp,
        tx_hash: result.result.hash,
        transaction_result: txResult,
        signers_used: uniqueSigners.map(s => s.signer_address),
      },
      run_at: new Date().toISOString(),
      triggered_by: 'manual',
    });

    if (!success) {
      return Response.json({
        success: false,
        error: txResult,
        tx_hash: result.result.hash,
      }, { status: 400 });
    }

    return Response.json({
      success: true,
      message: `Executed: ${action.amount_xrp} XRP transferred to ${action.recipient_name || action.recipient_address}`,
      tx_hash: result.result.hash,
      ledger_index: result.result.ledger_index,
      proposal_id: proposal.id,
      signers_used: uniqueSigners.slice(0, QUORUM).map(s => ({ name: s.signer_name, address: s.signer_address })),
    });

  } catch (error) {
    console.error('executeTreasuryAllocation error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  } finally {
    await client.disconnect();
  }
});