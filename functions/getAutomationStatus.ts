import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Fetch all automations
    const automations = await base44.asServiceRole.list_automations('all');
    
    // Categorize by status
    const active = automations.filter(a => a.is_active !== false);
    const inactive = automations.filter(a => a.is_active === false);
    const byType = {
      scheduled: automations.filter(a => a.automation_type === 'scheduled'),
      entity: automations.filter(a => a.automation_type === 'entity'),
      connector: automations.filter(a => a.automation_type === 'connector')
    };
    
    // Health check
    const health = {
      total: automations.length,
      active: active.length,
      inactive: inactive.length,
      byType: {
        scheduled: byType.scheduled.length,
        entity: byType.entity.length,
        connector: byType.connector.length
      },
      status: active.length > 0 ? 'healthy' : 'warning',
      automations: automations.map(a => ({
        id: a.id,
        name: a.name,
        type: a.automation_type,
        function: a.function_name,
        isActive: a.is_active !== false
      }))
    };
    
    return Response.json(health);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});