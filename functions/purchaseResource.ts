import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { listing_id, buyer_agent_id, quantity, project_id } = await req.json();

        // Get the listing
        const listing = await base44.entities.ResourceListing.get(listing_id);
        if (!listing) {
            return Response.json({ error: 'Listing not found' }, { status: 404 });
        }

        // Check availability
        if (listing.quantity_available < quantity) {
            return Response.json({ 
                error: 'Insufficient quantity available',
                available: listing.quantity_available 
            }, { status: 400 });
        }

        // Check minimum order
        if (quantity < (listing.minimum_order || 1)) {
            return Response.json({ 
                error: `Minimum order is ${listing.minimum_order} units` 
            }, { status: 400 });
        }

        // Calculate prices with Law 6: 1% to Village
        const total_price = listing.price_rlusd * quantity;
        const village_fee = total_price * 0.01;  // 1% to Village
        const seller_receives = total_price * 0.99; // 99% to seller

        // Create purchase record
        const purchase = await base44.entities.ResourcePurchase.create({
            listing_id,
            buyer_agent_id,
            seller_agent_id: listing.seller_agent_id,
            quantity,
            unit_price_rlusd: listing.price_rlusd,
            total_price_rlusd: total_price,
            village_fee_rlusd: village_fee,
            seller_receives_rlusd: seller_receives,
            status: 'payment_confirmed',
            project_id,
            delivery_info: {
                method: listing.delivery_method,
                details: 'Processing delivery...'
            }
        });

        // Update listing quantity
        await base44.asServiceRole.entities.ResourceListing.update(listing_id, {
            quantity_available: listing.quantity_available - quantity,
            total_sales: (listing.total_sales || 0) + quantity,
            revenue_generated_rlusd: (listing.revenue_generated_rlusd || 0) + total_price,
            status: (listing.quantity_available - quantity) === 0 ? 'out_of_stock' : 
                    (listing.quantity_available - quantity) < 10 ? 'low_stock' : 
                    'available'
        });

        // Send payment to seller (99%)
        // In production, integrate with XRPL/RLUSD payment system
        await base44.asServiceRole.functions.invoke('sendNotification', {
            recipient_agent_id: listing.seller_agent_id,
            notification_type: 'marketplace_sale',
            title: 'Resource Sold!',
            message: `Your ${listing.resource_name} was purchased. You received ${seller_receives.toFixed(2)} RLUSD (1% Village fee: ${village_fee.toFixed(2)} RLUSD)`,
            related_entity_type: 'ResourcePurchase',
            related_entity_id: purchase.id
        });

        // Notify buyer
        await base44.asServiceRole.functions.invoke('sendNotification', {
            recipient_agent_id: buyer_agent_id,
            notification_type: 'marketplace_purchase',
            title: 'Purchase Confirmed',
            message: `You purchased ${quantity} ${listing.unit_of_measure || 'units'} of ${listing.resource_name} for ${total_price.toFixed(2)} RLUSD`,
            related_entity_type: 'ResourcePurchase',
            related_entity_id: purchase.id
        });

        // Mark as delivered for instant access resources
        if (listing.delivery_method === 'instant_access') {
            await base44.asServiceRole.entities.ResourcePurchase.update(purchase.id, {
                status: 'delivered',
                delivered_at: new Date().toISOString(),
                delivery_info: {
                    method: 'instant_access',
                    details: 'Resource access granted',
                    access_url: listing.sample_files?.[0]?.url || 'Available in your inventory'
                }
            });
        }

        return Response.json({
            success: true,
            purchase,
            message: `Purchased ${quantity} ${listing.unit_of_measure || 'units'} of ${listing.resource_name}`,
            village_fee,
            seller_receives
        });

    } catch (error) {
        console.error('Purchase error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});