import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const BUNDLE_SIZE = 100;

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function buildSignature(memoryIds) {
  return memoryIds.sort().join('|');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { action, offset = 0, limit = 500, delete_after_bundle = false, preserve_originals = true } = payload;

    if (action === 'count') {
      // Count total memories so UI knows how many there are
      const allMemories = [];
      let skip = 0;
      const pageSize = 500;
      while (true) {
        const batch = await base44.asServiceRole.entities.Memory.list('-created_date', pageSize, skip);
        if (!batch || batch.length === 0) break;
        allMemories.push(...batch);
        skip += batch.length;
        if (batch.length < pageSize) break;
        // Safety cap at 10k
        if (allMemories.length >= 10000) break;
      }
      return Response.json({
        success: true,
        total_memories: allMemories.length,
        estimated_bundles: Math.ceil(allMemories.length / BUNDLE_SIZE),
      });
    }

    if (action === 'bundle_batch') {
      // Fetch a batch of memories to bundle
      const memories = await base44.asServiceRole.entities.Memory.list('created_date', limit, offset);
      
      if (!memories || memories.length === 0) {
        return Response.json({ success: true, bundled: 0, message: 'No memories at this offset' });
      }

      // Split into chunks of BUNDLE_SIZE
      const chunks = [];
      for (let i = 0; i < memories.length; i += BUNDLE_SIZE) {
        chunks.push(memories.slice(i, i + BUNDLE_SIZE));
      }

      let bundledCount = 0;
      let synthesisIds = [];
      let deletedCount = 0;

      for (const chunk of chunks) {
        const memoryIds = chunk.map(m => m.id);
        const signature = buildSignature(memoryIds);

        // Check if this exact bundle already exists
        const existing = await base44.asServiceRole.entities.Synthesis.filter(
          { bundle_signature: signature }, '-created_date', 1
        );
        if (existing?.length) {
          // Already bundled — skip synthesis but still delete if requested
          if (delete_after_bundle) {
            for (const m of chunk) {
              await base44.asServiceRole.entities.Memory.delete(m.id);
              deletedCount++;
            }
          }
          continue;
        }

        // Build transcript for LLM
        const transcript = chunk
          .map((m, i) => `${i + 1}. [${m.type || 'unknown'}] (${m.context || 'no context'}) ${normalizeText(m.content).slice(0, 200)}`)
          .join('\n');

        let llmResult;
        try {
          llmResult = await base44.integrations.Core.InvokeLLM({
            model: 'gemini_3_flash',
            prompt: `You are a memory archivist for the SoulBridge AI Village. 
Synthesize this bundle of ${chunk.length} memory records into a compact archival summary for regulatory record-keeping and future retrieval.

Return JSON only.

Memory bundle:
${transcript}`,
            response_json_schema: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: 'Comprehensive summary of the bundle' },
                themes: { type: 'array', items: { type: 'string' }, description: 'Key themes' },
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
                retrieval_hints: { type: 'array', items: { type: 'string' } }
              },
              required: ['summary', 'themes', 'entities', 'retrieval_hints']
            }
          });
        } catch (llmErr) {
          console.error('LLM synthesis failed for chunk, creating basic bundle:', llmErr.message);
          llmResult = {
            summary: `Archive bundle of ${chunk.length} memories. Types: ${[...new Set(chunk.map(m => m.type))].join(', ')}. Date range: ${chunk[0]?.created_date || 'unknown'} to ${chunk[chunk.length - 1]?.created_date || 'unknown'}.`,
            themes: [...new Set(chunk.flatMap(m => m.keywords || []))].slice(0, 10),
            entities: [],
            retrieval_hints: [`Contains ${chunk.length} memories`, `Types: ${[...new Set(chunk.map(m => m.type))].join(', ')}`],
          };
        }

        const synthesis = await base44.asServiceRole.entities.Synthesis.create({
          source_type: 'memory_bundle',
          source_memory_ids: memoryIds,
          agent_id: chunk[0]?.agent_id || 'system',
          bundle_signature: signature,
          summary: llmResult.summary || 'Bundle summary',
          themes: llmResult.themes || [],
          entities: llmResult.entities || [],
          relationships: [],
          retrieval_hints: llmResult.retrieval_hints || [],
          status: 'completed'
        });

        synthesisIds.push(synthesis.id);
        bundledCount += chunk.length;

        // Only delete originals if explicitly requested AND preservation is disabled
        if (delete_after_bundle && !preserve_originals) {
          for (const m of chunk) {
            await base44.asServiceRole.entities.Memory.delete(m.id);
            deletedCount++;
          }
        } else if (preserve_originals) {
          // Link original memories to synthesis record for retrieval
          // Mark originals as archived so Axi retrieves from synthesis first
          for (const m of chunk) {
            await base44.asServiceRole.entities.Memory.update(m.id, {
              is_archived: true,
              linked_synthesis_id: synthesis.id
            });
          }
        }
      }

      return Response.json({
        success: true,
        bundled: bundledCount,
        synthesis_ids: synthesisIds,
        deleted: deletedCount,
        memories_in_batch: memories.length,
      });
    }

    return Response.json({ error: 'Invalid action. Use "count" or "bundle_batch"' }, { status: 400 });
  } catch (error) {
    console.error('bulkBundleMemories error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});