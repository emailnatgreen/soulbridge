import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// v3 — forced redeploy — auth header sanitized for mobile browsers
function sanitizeRequest(req, bodyStr) {
  const authHeader = (req.headers.get('authorization') || '').trim();
  const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const isValidJwt = rawToken && rawToken.includes('.') && rawToken.length > 20;

  const h = new Headers();
  h.set('content-type', 'application/json');
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === 'authorization') continue;
    if (key.startsWith('base44') || key.startsWith('x-base44') || key.startsWith('x-app')) {
      h.set(key, value);
    }
  }
  h.set('authorization', isValidJwt ? `Bearer ${rawToken}` : 'Bearer anon.anon.anon');
  return new Request(req.url, { method: req.method, headers: h, body: bodyStr });
}

Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);

    const base44 = createClientFromRequest(sanitizeRequest(req, bodyStr));

    // Resolve user context (optional — signals work even for anon visitors)
    const authHeader = (req.headers.get('authorization') || '').trim();
    const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const isValidJwt = rawToken && rawToken.includes('.') && rawToken.length > 20;

    let user = null;
    if (isValidJwt) {
      try { user = await base44.auth.me(); } catch (_) {}
    }

    const { page, path, referrer, metadata } = body;

    // Store signal in JukeboxDecision entity (page_view type)
    await base44.asServiceRole.entities.JukeboxDecision.create({
      decision_type: 'page_view',
      context: JSON.stringify({
        page: page || path || 'unknown',
        path: path || '',
        referrer: referrer || '',
        user_id: user?.id || 'anonymous',
        user_email: user?.email || 'anonymous',
        user_role: user?.role || 'visitor',
        timestamp: new Date().toISOString(),
        ...(metadata || {})
      }),
      status: 'executed',
      outcome: `Page view: ${page || path || 'unknown'}`,
    });

    return Response.json({ success: true, page: page || path });
  } catch (error) {
    console.error('[routePageSignal] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});