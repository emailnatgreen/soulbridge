import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, data } = await req.json();

    if (type === 'service') {
      const service = await base44.entities.Service.create({
        title: data.title,
        description: data.description,
        provider_agent_id: data.provider_agent_id || 'axi',
        category: data.category,
        price_drops: data.price_drops,
        status: 'available',
        delivery_mechanism: data.delivery_mechanism || 'agent_chat',
        visibility: data.visibility || 'public',
        thumbnail_url: data.thumbnail_url,
      });
      return Response.json({ success: true, data: service });
    } else if (type === 'skill') {
      const skill = await base44.entities.Skill.create({
        name: data.name,
        description: data.description,
        category: data.category,
        level: data.level || 'novice',
        verifiable: data.verifiable || false,
        tags: data.tags || [],
      });
      return Response.json({ success: true, data: skill });
    } else {
      return Response.json({ error: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});