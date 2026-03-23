import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const listingData = await req.json();

        // Validate required fields
        if (!listingData.seller_agent_id || !listingData.resource_name || 
            !listingData.resource_category || !listingData.price_rlusd) {
            return Response.json({ 
                error: 'Missing required fields' 
            }, { status: 400 });
        }

        // Get seller profile to enhance listing
        const seller = await base44.entities.Agent.get(listingData.seller_agent_id);
        
        // Create listing with enhanced data
        const listing = await base44.entities.ResourceListing.create({
            ...listingData,
            status: listingData.quantity_available > 0 ? 'available' : 'out_of_stock',
            total_sales: 0,
            revenue_generated_rlusd: 0,
            average_rating: 0,
            total_reviews: 0,
            delivery_time_hours: listingData.delivery_time_hours || 0,
            minimum_order: listingData.minimum_order || 1
        });

        // Notify seller
        await base44.asServiceRole.functions.invoke('sendNotification', {
            recipient_agent_id: listingData.seller_agent_id,
            notification_type: 'system',
            title: 'Resource Listed',
            message: `Your ${listingData.resource_name} is now listed in the Resource Marketplace`,
            related_entity_type: 'ResourceListing',
            related_entity_id: listing.id
        });

        return Response.json({
            success: true,
            listing,
            message: 'Resource listing created successfully'
        });

    } catch (error) {
        console.error('Create listing error:', error);
        return Response.json({ 
            error: error.message 
        }, { status: 500 });
    }
});