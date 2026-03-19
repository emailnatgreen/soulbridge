import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    
    // Handle both direct invocation and entity automation payload
    const signal_id = payload.signal_id || payload.event?.entity_id;
    let report_title = payload.report_title;
    let report_summary = payload.report_summary;
    let category = payload.category || 'governance';
    let report_url = payload.report_url;
    let is_critical = payload.is_critical;

    // If triggered from entity automation, fetch Signal metadata
    if (!report_title && signal_id) {
      const signals = await base44.asServiceRole.entities.Signal.filter({ id: signal_id });
      if (signals.length) {
        const signal = signals[0];
        const metadata = signal.metadata || {};
        report_title = `${signal.page_name || 'AI Intel Report'} - ${metadata.alert_type || 'Analysis'}`;
        report_summary = metadata.findings || signal.page_name;
        is_critical = metadata.findings ? true : false;
      }
    }

    if (!report_title) {
      return Response.json({ error: 'report_title or signal_id required' }, { status: 400 });
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