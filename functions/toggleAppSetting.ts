import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { setting_key, setting_value } = await req.json();

    if (!setting_key || typeof setting_value !== 'boolean') {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Check if setting exists
    const existing = await base44.asServiceRole.entities.AppSettings.filter({ setting_key });

    if (existing.length > 0) {
      // Update existing
      await base44.asServiceRole.entities.AppSettings.update(existing[0].id, { setting_value });
    } else {
      // Create new
      await base44.asServiceRole.entities.AppSettings.create({
        setting_key,
        setting_value,
        description: setting_key === 'registrations_enabled' ? 'Control agent registrations' : setting_key
      });
    }

    return Response.json({ success: true, setting_key, setting_value });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});