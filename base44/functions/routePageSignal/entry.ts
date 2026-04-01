import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const headers = new Headers(req.headers);
    const authHeader = (headers.get('authorization') || '').trim();
    const bearerValue = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerValue) {
      headers.delete('authorization');
    }

    const body = await req.json();
    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers,
      body: JSON.stringify(body),
    }));
    const { 
      page, 
      path, 
      timestamp, 
      userEmail, 
      userId,
      search,
      metadata 
    } = body;

    // Authenticate user context only when a user session exists
    let user = null;
    if (bearerValue) {
      try {
        user = await base44.auth.me();
      } catch (e) {
        user = null;
      }
    }

    // Create comprehensive Signal record for Jukebox Brain
    const signal = await base44.asServiceRole.entities.Signal.create({
      signal_type: 'page_view',
      source: 'frontend',
      page_name: page,
      page_path: path,
      user_email: user?.email || userEmail,
      user_id: user?.id || userId,
      timestamp: timestamp,
      metadata: {
        viewport: metadata?.viewport,
        referrer: metadata?.referrer,
        pageTitle: metadata?.title,
        searchParams: search,
        signal_time: new Date().toISOString(),
      },
    });

    return Response.json({ 
      success: true,
      signal: 'page_view_routed',
      signalId: signal.id,
      page: page,
      timestamp: timestamp,
    });
  } catch (error) {
    console.error('Page signal routing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});