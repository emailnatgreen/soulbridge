import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data, entity_id } = payload;

    // Handle VillagePage creation event
    if (event?.type === 'create' && event?.entity_name === 'VillagePage') {
      const villagePage = data;

      if (!villagePage) {
        console.log('No VillagePage data provided');
        return Response.json({ success: false, message: 'No page data' });
      }

      // Create a notification/memory that Axi Command Dashboard should refresh
      const memory = await base44.asServiceRole.entities.Memory.create({
        agent_id: 'axi_main_001',
        type: 'system_event',
        content: `New VillagePage created: ${villagePage.name} (${villagePage.path})`,
        keywords: ['page_creation', 'dashboard_update', villagePage.category || 'general'],
        context: `VillagePage ID: ${entity_id}. Path: ${villagePage.path}. Status: ${villagePage.status}`,
        importance: villagePage.priority === 'high' ? 9 : 5,
        related_entity_id: entity_id,
        related_entity_type: 'VillagePage'
      });

      // Send notification to Axi about the new page
      await base44.asServiceRole.entities.Signal.create({
        signal_type: 'system_event',
        source: 'automation',
        page_name: 'AxiCommandDashboard',
        page_path: '/AxiCommandDashboard',
        user_email: 'system@soulbridge.local',
        user_id: 'system_automation',
        timestamp: new Date().toISOString(),
        metadata: {
          event_type: 'page_created',
          village_page_id: entity_id,
          village_page_name: villagePage.name,
          village_page_path: villagePage.path,
          village_page_category: villagePage.category,
          action: 'refresh_page_list',
          requires_dashboard_update: true
        }
      });

      console.log(`Page sync: ${villagePage.name} created, Axi notified`);
      return Response.json({ success: true, memory_id: memory.id });
    }

    return Response.json({ success: false, message: 'No page creation event' });
  } catch (error) {
    console.error('syncPageUpdatesToAxiDashboard error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});