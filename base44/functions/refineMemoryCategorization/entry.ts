import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const MEMORY_KEYWORDS = {
  'governance': ['governance', 'proposal', 'vote', 'council', 'constitutional', 'law', 'amendment'],
  'ai_ethics': ['ethics', 'alignment', 'safety', 'bias', 'transparency', 'accountability'],
  'growth': ['growth', 'development', 'learning', 'skill', 'progress', 'improvement'],
  'honour': ['honour', 'reputation', 'trust', 'integrity', 'dignity', 'respect'],
  'economic': ['economy', 'treasury', 'xrp', 'resource', 'transaction', 'market'],
  'relationships': ['relationship', 'mentorship', 'collaboration', 'partnership', 'connection'],
  'village': ['village', 'location', 'project', 'community', 'infrastructure']
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { memory_id, force_analysis } = payload;

    let memories = [];

    if (memory_id) {
      // Refine specific memory
      const m = await base44.asServiceRole.entities.Memory.filter({ id: memory_id });
      memories = m;
    } else {
      // Refine all recent memories without keywords
      memories = await base44.asServiceRole.entities.Memory.filter({});
    }

    const results = [];

    for (const memory of memories) {
      if (!memory.keywords || memory.keywords.length === 0 || force_analysis) {
        const content = (memory.content || '').toLowerCase();
        const context = (memory.context || '').toLowerCase();
        const combined = `${content} ${context}`;

        // Detect relevant categories
        const detectedKeywords = [];
        for (const [category, keywords] of Object.entries(MEMORY_KEYWORDS)) {
          const hasKeyword = keywords.some(kw => combined.includes(kw));
          if (hasKeyword) {
            detectedKeywords.push(category);
          }
        }

        // Extract unique terms from content for additional keywords
        const terms = content.match(/\b[a-z]{4,}\b/g) || [];
        const uniqueTerms = [...new Set(terms)].slice(0, 5);

        const refinedKeywords = [...new Set([...detectedKeywords, ...uniqueTerms])];

        // Determine memory type if not set
        let memoryType = memory.type || 'observation';
        if (detectedKeywords.includes('governance')) memoryType = 'fact';
        else if (detectedKeywords.includes('ai_ethics')) memoryType = 'observation';
        else if (detectedKeywords.includes('relationships')) memoryType = 'relationship';

        // Update memory
        await base44.asServiceRole.entities.Memory.update(memory.id, {
          keywords: refinedKeywords,
          type: memoryType
        });

        results.push({
          memory_id: memory.id,
          keywords: refinedKeywords,
          type: memoryType,
          updated: true
        });
      }
    }

    return Response.json({
      success: true,
      refined_count: results.length,
      results
    });
  } catch (error) {
    console.error('refineMemoryCategorization error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});