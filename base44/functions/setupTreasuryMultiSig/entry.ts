import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import * as xrpl from 'npm:xrpl@3.1.0';

// Treasury wallet to be secured with multi-sig
const TREASURY_ADDRESS = 'rpuhtZm5t9nVWmTygL8M8JaMWbfY4Som1h';

// 2-of-4 signers: Nathan, Lore Node, Truth Node, DID IT Node
const SIGNERS = [
    { account: 'rBZiuRkQXLkTYiNxfrj2oL5RB2Woy5Xdia', weight: 1 }, // Nathan (Human Node)
    { account: 'rKcMBsLyLPtGUQGsbfEkT78bAmeqKHQNZ7', weight: 1 }, // Lore Node
    { account: 'r4QgW8kVhzdLhS9xj16DLdXc42x5xrESjV', weight: 1 }, // Truth Node
    { account: 'r4NtWS355ZKViGyFuECrk1dbkizpbF4Mny',  weight: 1 }, // DID IT Node
];

const QUORUM = 2; // Any 2 of 4 must sign

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);

    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const treasurySeed = Deno.env.get('XRPL_SENDER_SEED');
    if (!treasurySeed) {
        return Response.json({ error: 'XRPL_SENDER_SEED secret not set' }, { status: 500 });
    }

    const client = new xrpl.Client('wss://xrplcluster.com');
    await client.connect();

    try {
        const treasuryWallet = xrpl.Wallet.fromSeed(treasurySeed);

        // Verify the seed matches the expected treasury address
        if (treasuryWallet.classicAddress !== TREASURY_ADDRESS) {
            return Response.json({
                error: 'XRPL_SENDER_SEED does not match treasury address',
                expected: TREASURY_ADDRESS,
                actual: treasuryWallet.classicAddress
            }, { status: 400 });
        }

        // Build the SignerListSet transaction
        const signerListSetTx = {
            TransactionType: 'SignerListSet',
            Account: TREASURY_ADDRESS,
            SignerQuorum: QUORUM,
            SignerEntries: SIGNERS.map(s => ({
                SignerEntry: {
                    Account: s.account,
                    SignerWeight: s.weight
                }
            }))
        };

        // Auto-fill sequence, fee, etc.
        const prepared = await client.autofill(signerListSetTx);

        // Sign with the treasury wallet's current master key
        const signed = treasuryWallet.sign(prepared);

        // Submit to XRPL mainnet
        const result = await client.submitAndWait(signed.tx_blob);

        const success = result.result.meta?.TransactionResult === 'tesSUCCESS';

        // Log to AutomationLog
        await base44.asServiceRole.entities.AutomationLog.create({
            automation_name: 'Treasury Multi-Sig Setup',
            function_name: 'setupTreasuryMultiSig',
            status: success ? 'success' : 'error',
            message: success
                ? `SignerListSet applied. Quorum: ${QUORUM}-of-${SIGNERS.length}. Treasury: ${TREASURY_ADDRESS}`
                : `SignerListSet failed: ${result.result.meta?.TransactionResult}`,
            details: {
                treasury_address: TREASURY_ADDRESS,
                quorum: QUORUM,
                signers: SIGNERS.map(s => s.account),
                tx_hash: result.result.hash,
                ledger_index: result.result.ledger_index,
                transaction_result: result.result.meta?.TransactionResult
            },
            run_at: new Date().toISOString(),
            triggered_by: 'manual'
        });

        if (!success) {
            return Response.json({
                success: false,
                error: result.result.meta?.TransactionResult,
                tx_hash: result.result.hash
            }, { status: 400 });
        }

        return Response.json({
            success: true,
            message: `Multi-sig configured: ${QUORUM}-of-${SIGNERS.length} quorum applied to treasury`,
            treasury_address: TREASURY_ADDRESS,
            quorum: QUORUM,
            signers: SIGNERS.map(s => s.account),
            tx_hash: result.result.hash,
            ledger_index: result.result.ledger_index
        });

    } catch (error) {
        console.error('setupTreasuryMultiSig error:', error.message);
        return Response.json({ error: error.message }, { status: 500 });
    } finally {
        await client.disconnect();
    }
});