import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return Response.json({ error: 'conversation_id required' }, { status: 400 });
    }

    const headers = new Headers(req.headers);
    const authHeader = (headers.get('authorization') || '').trim();
    const bearerValue = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!bearerValue) {
      headers.delete('authorization');
    }

    const base44 = createClientFromRequest(new Request(req.url, {
      method: req.method,
      headers,
      body: JSON.stringify(body),
    }));

    const messages = await base44.asServiceRole.entities.AgentMessage.filter(
      { conversation_id },
      'created_date',
      100
    );

    return Response.json({ messages: messages || [] });
  } catch (error) {
    console.error('Error data:', error?.data || error?.message || error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});