import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * Processes page view signals and converts them into memory entries
 * for the Jukebox Brain's comprehension of user behavior and system state
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    // Extract Signal from entity automation payload or direct invocation
    let signal = body.signal || body.data;
    const signal_id = body.signal_id || body.event?.entity_id;
    
    // If triggered by Signal create/update automation, fetch the Signal by entity_id
    if (!signal && signal_id) {
      try {
        const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
        if (signals.length > 0) {
          signal = signals[0];
        }
      } catch (err) {
        console.error(`Failed to fetch Signal ${signal_id}:`, err.message);
      }
    }
    
    if (!signal) {
      return Response.json({ error: 'No signal provided' }, { status: 400 });
    }

    // Get user context for personalized memory (optional in service context)
    let user_id = null;
    try {
      const user = await base44.auth.me();
      user_id = user?.id;
    } catch (e) {
      // Continue for service role or public contexts
      console.warn('User context unavailable (service role)');
    }

    // Create memory entry from page signal
    const memory = await base44.asServiceRole.entities.Memory.create({
      agent_id: 'axi', // Axi absorbs page view intelligence
      user_id: user_id,
      type: 'observation',
      content: `User viewed page: ${signal.page_name} at ${signal.timestamp}. Path: ${signal.page_path}. Viewport: ${signal.metadata?.viewport?.width}x${signal.metadata?.viewport?.height}`,
      keywords: [
        signal.page_name.toLowerCase(),
        'page_view',
        'user_interaction',
        'navigation',
      ],
      context: `User navigated to ${signal.page_name}. Referrer: ${signal.metadata?.referrer || 'direct'}`,
      importance: signal.metadata?.referrer ? 6 : 5,
      related_entity_type: 'page_view',
      related_entity_id: signal.id,
    });

    return Response.json({ 
      success: true, 
      memory_created: memory.id,
      page: signal.page_name,
    });
  } catch (error) {
    console.error('Page signal to memory conversion error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});