import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildSignature(memories) {
  return memories
    .map((memory) => `${memory.id}:${normalizeText(memory.content).slice(0, 120)}`)
    .sort()
    .join('|');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const eventData = payload?.data || payload;
    const memoryId = eventData?.id;

    if (!memoryId) {
      return Response.json({ error: 'Missing memory id' }, { status: 400 });
    }

    const createdMemory = await base44.asServiceRole.entities.Memory.filter({ id: memoryId }, '', 1);
    const seedMemory = createdMemory?.[0];

    if (!seedMemory || seedMemory.type !== 'conversation_snippet' || seedMemory.agent_id !== 'axi') {
      return Response.json({ success: true, skipped: true, reason: 'Not an axi conversation snippet' });
    }

    const recentMemories = await base44.asServiceRole.entities.Memory.filter({
      agent_id: 'axi',
      type: 'conversation_snippet'
    }, '-created_date', 30);

    const candidateMemories = recentMemories
      .filter((memory) => {
        const created = new Date(memory.created_date || 0).getTime();
        const seedCreated = new Date(seedMemory.created_date || 0).getTime();
        return Math.abs(seedCreated - created) <= 10 * 60 * 1000;
      })
      .reverse();

    if (!candidateMemories.length) {
      return Response.json({ success: true, skipped: true, reason: 'No bundle memories found' });
    }

    const bundleSignature = buildSignature(candidateMemories);
    const existing = await base44.asServiceRole.entities.Synthesis.filter({ bundle_signature: bundleSignature }, '-created_date', 1);
    if (existing?.length) {
      return Response.json({ success: true, skipped: true, reason: 'Synthesis already exists', synthesis_id: existing[0].id });
    }

    const transcript = candidateMemories
      .map((memory, index) => `${index + 1}. [${memory.context || 'AxiChat'}] ${normalizeText(memory.content)}`)
      .join('\n');

    const llmResult = await base44.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      prompt: `You are the Neural Memory Synthesis engine for Axi. Analyze this conversation bundle and produce a compact semantic synthesis for smarter future retrieval.\n\nReturn JSON only.\n\nConversation bundle:\n${transcript}`,
      response_json_schema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          themes: { type: 'array', items: { type: 'string' } },
          entities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                type: { type: 'string' },
                salience: { type: 'number' },
                notes: { type: 'string' }
              }
            }
          },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source: { type: 'string' },
                target: { type: 'string' },
                relationship: { type: 'string' },
                strength: { type: 'number' }
              }
            }
          },
          retrieval_hints: { type: 'array', items: { type: 'string' } }
        },
        required: ['summary', 'themes', 'entities', 'relationships', 'retrieval_hints']
      }
    });

    const synthesis = await base44.asServiceRole.entities.Synthesis.create({
      source_type: 'memory_bundle',
      source_memory_ids: candidateMemories.map((memory) => memory.id),
      agent_id: 'axi',
      bundle_signature: bundleSignature,
      summary: llmResult.summary,
      themes: llmResult.themes,
      entities: llmResult.entities,
      relationships: llmResult.relationships,
      retrieval_hints: llmResult.retrieval_hints,
      status: 'completed'
    });

    return Response.json({ success: true, synthesis_id: synthesis.id });
  } catch (error) {
    console.error('neuralMemorySynthesis error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});