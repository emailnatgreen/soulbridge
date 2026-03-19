import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { report_title, report_summary, category, report_url, is_critical } = payload;

    if (!report_title) {
      return Response.json({ error: 'report_title required' }, { status: 400 });
    }

    // Generate a URL-safe path
    const path = '/' + report_title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Check if VillagePage already exists
    const existing = await base44.asServiceRole.entities.VillagePage.filter({ path });
    if (existing.length) {
      return Response.json({
        success: false,
        message: 'VillagePage already exists for this report',
        path
      }, { status: 409 });
    }

    // Create VillagePage as canonical source
    const villagePage = await base44.asServiceRole.entities.VillagePage.create({
      name: report_title,
      path,
      category: category || 'admin',
      status: 'active',
      description: report_summary || `Canonical record for ${report_title}`,
      is_public: is_critical !== false, // Critical reports are public by default
      priority: is_critical ? 'high' : 'medium',
      metadata: {
        report_url,
        created_from: 'ai_intel_system',
        created_at: new Date().toISOString(),
        is_critical_report: is_critical || false
      }
    });

    return Response.json({
      success: true,
      village_page_id: villagePage.id,
      path: villagePage.path,
      name: villagePage.name
    });
  } catch (error) {
    console.error('autoCreateVillagePageForReport error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});