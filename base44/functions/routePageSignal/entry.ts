import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// v4 — proper JWT fallback for mobile browsers
const ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbm9uIiwiaWF0IjowfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

function sanitizeRequest(req, bodyStr) {
  const auth = (req.headers.get('authorization') || '').trim();
  const isProperJwt = /^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(auth);

  const h = new Headers();
  h.set('content-type', 'application/json');
  for (const [key, value] of req.headers.entries()) {
    if (key.toLowerCase() === 'authorization') continue;
    if (key.startsWith('base44') || key.startsWith('x-base44') || key.startsWith('x-app')) {
      h.set(key, value);
    }
  }
  h.set('authorization', isProperJwt ? auth : `Bearer ${ANON_JWT}`);
  return new Request(req.url, { method: req.method, headers: h, body: bodyStr });
}

Deno.serve(async (req) => {
  try {
    const bodyStr = await req.text();
    const body = JSON.parse(bodyStr);

    const base44 = createClientFromRequest(sanitizeRequest(req, bodyStr));

    // Try to get user if authenticated
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}

    const { page, path, referrer, metadata } = body;

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