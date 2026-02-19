import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { Client, Wallet } from 'npm:xrpl@4.2.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { listing_id, buyer_agent_id, requirements } = await req.json();

        if (!listing_id || !buyer_agent_id) {
            return Response.json({ error: 'listing_id and buyer_agent_id required' }, { status: 400 });
        }

        // Get listing details
        const listing = await base44.entities.MarketplaceListing.get(listing_id);
        if (!listing) {
            return Response.json({ error: 'Listing not found' }, { status: 404 });
        }

        if (listing.status !== 'available') {
            return Response.json({ error: 'Listing not available' }, { status: 400 });
        }

        // Get buyer and seller agents
        const buyer = await base44.entities.Agent.get(buyer_agent_id);
        const seller = await base44.entities.Agent.get(listing.agent_id);

        if (!buyer || !seller) {
            return Response.json({ error: 'Agent not found' }, { status: 404 });
        }

        // Get wallets
        const buyerWallet = await base44.entities.Wallet.get(buyer.wallet_id);
        const sellerWallet = await base44.entities.Wallet.get(seller.wallet_id);

        if (!buyerWallet || !sellerWallet) {
            return Response.json({ error: 'Wallet not found' }, { status: 404 });
        }

        // Connect to XRPL and send RLUSD payment
        const client = new Client('wss://xrpl.ws');
        await client.connect();

        const buyerXrplWallet = Wallet.fromSeed(buyerWallet.seed);

        const payment = {
            TransactionType: 'Payment',
            Account: buyerXrplWallet.classicAddress,
            Destination: sellerWallet.classic_address,
            Amount: {
                currency: 'USD',
                value: listing.price_rlusd.toString(),
                issuer: 'rMxCKbEDwqr76QuheSUMdEGf4B9xJ8m5De'
            }
        };

        const prepared = await client.autofill(payment);
        const signed = buyerXrplWallet.sign(prepared);
        const result = await client.submitAndWait(signed.tx_blob);

        await client.disconnect();

        if (result.result.meta.TransactionResult !== "tesSUCCESS") {
            return Response.json({ 
                error: 'Payment failed',
                details: result.result.meta.TransactionResult 
            }, { status: 500 });
        }

        // Calculate expected completion
        const expectedCompletion = new Date();
        expectedCompletion.setHours(expectedCompletion.getHours() + (listing.delivery_time_hours || 24));

        // Create contract
        const contract = await base44.asServiceRole.entities.MarketplaceContract.create({
            listing_id: listing_id,
            buyer_agent_id: buyer_agent_id,
            seller_agent_id: listing.agent_id,
            price_paid_rlusd: listing.price_rlusd,
            status: 'pending',
            requirements: requirements || '',
            expected_completion: expectedCompletion.toISOString(),
            xrp_transaction_hash: result.result.hash
        });

        // Update listing stats
        await base44.asServiceRole.entities.MarketplaceListing.update(listing_id, {
            total_sales: (listing.total_sales || 0) + 1
        });

        // Create notification for seller
        await base44.asServiceRole.entities.AgentNotification.create({
            recipient_agent_id: seller.id,
            notification_type: 'system',
            title: 'New Service Purchase',
            message: `${buyer.name} purchased your service: ${listing.title}`,
            priority: 'high'
        });

        return Response.json({
            success: true,
            contract,
            transaction_hash: result.result.hash,
            message: `Successfully purchased ${listing.title} for ${listing.price_rlusd} RLUSD`
        });

    } catch (error) {
        console.error('Purchase error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});