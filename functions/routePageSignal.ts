import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { page, path, timestamp } = body;

    // Create Signal record for Jukebox Brain
    await base44.asServiceRole.entities.Signal.create({
      signal_type: 'page_view',
      source: 'frontend',
      page_name: page,
      page_path: path,
      metadata: { timestamp },
    });

    return Response.json({ success: true, signal: 'page_view_routed' });
  } catch (error) {
    console.error('Page signal routing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});