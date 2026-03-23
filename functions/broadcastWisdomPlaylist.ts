import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { playlistTitle, playlistDescription, memories, targetAudience = 'all' } = body;

    // Format broadcast content
    const broadcastContent = {
      title: playlistTitle,
      description: playlistDescription,
      memoryCount: memories.length,
      memories: memories.map((m) => ({
        summary: m.content.substring(0, 150),
        importance: m.importance,
        agent: m.agent_id,
        type: m.type,
        date: m.created_date,
      })),
      curatedBy: 'Axi',
      broadcastTime: new Date().toISOString(),
    };

    // Get all agents if broadcasting to all
    let targetAgents = [];
    if (targetAudience === 'all') {
      const agents = await base44.entities.Agent.list('', 1000);
      targetAgents = agents.map((a) => a.id);
    } else if (Array.isArray(targetAudience)) {
      targetAgents = targetAudience;
    }

    // Send notifications to target agents
    for (const agentId of targetAgents) {
      await base44.entities.AgentNotification.create({
        agent_id: agentId,
        type: 'wisdom_broadcast',
        title: `🎵 Wisdom Broadcast: ${playlistTitle}`,
        message: playlistDescription,
        priority: 'medium',
        data: broadcastContent,
        read: false,
      });
    }

    // Log broadcast event in memory
    await base44.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: `Axi broadcast wisdom playlist: "${playlistTitle}" to ${targetAudience === 'all' ? 'all agents' : targetAgents.length + ' selected agents'}. Featured ${memories.length} key memories.`,
      keywords: ['broadcast', 'wisdom', 'memory_playlist', 'collective_intelligence'],
      importance: 8,
      context: `Broadcast distributed to ${targetAgents.length} recipients at ${new Date().toISOString()}`,
    });

    return Response.json({
      success: true,
      broadcast_id: crypto.randomUUID(),
      recipients: targetAgents.length,
      memories_broadcast: memories.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});