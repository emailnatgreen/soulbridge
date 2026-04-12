import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const body = await req.json();

    // Extract and validate JWT token from authorization header
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const isValidJwt = rawToken && rawToken.includes('.') && rawToken.length > 20;

    // Build a completely fresh request — only include headers we explicitly set
    const freshHeaders = new Headers();
    freshHeaders.set('content-type', 'application/json');
    // Copy over platform headers needed by the SDK (base44-*, x-base44-*, x-app-*)
    for (const [key, value] of req.headers.entries()) {
      if (key.toLowerCase() === 'authorization') continue;
      if (key.startsWith('base44') || key.startsWith('x-base44') || key.startsWith('x-app')) {
        freshHeaders.set(key, value);
      }
    }
    freshHeaders.set('authorization', isValidJwt ? `Bearer ${rawToken}` : 'Bearer anonymous');

    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers: freshHeaders,
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

    // Authenticate user context only when a valid JWT session exists
    let user = null;
    if (isValidJwt) {
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