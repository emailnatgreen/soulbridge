import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const query = (body.query || body.search || body.keyword || '').toLowerCase().trim();

    if (!query) {
      return Response.json({ results: [], message: 'No search query provided' });
    }

    // Fetch recent Synthesis records
    const syntheses = await base44.asServiceRole.entities.Synthesis.filter(
      { status: 'completed' }, '-created_date', 100
    );

    if (!syntheses || syntheses.length === 0) {
      return Response.json({ results: [], message: 'No synthesis records found' });
    }

    // Score each synthesis by relevance to the query
    const keywords = query.split(/\s+/).filter(Boolean);
    
    const scored = syntheses.map(s => {
      let score = 0;
      const searchableText = [
        s.summary || '',
        (s.themes || []).join(' '),
        (s.retrieval_hints || []).join(' '),
        (s.entities || []).map(e => `${e.name} ${e.type} ${e.notes || ''}`).join(' '),
        (s.relationships || []).map(r => `${r.source} ${r.target} ${r.relationship}`).join(' ')
      ].join(' ').toLowerCase();

      for (const kw of keywords) {
        if (searchableText.includes(kw)) score += 1;
        // Boost for theme matches
        if ((s.themes || []).some(t => t.toLowerCase().includes(kw))) score += 2;
        // Boost for retrieval hint matches
        if ((s.retrieval_hints || []).some(h => h.toLowerCase().includes(kw))) score += 2;
      }

      return { ...s, _relevance: score };
    });

    // Filter and sort by relevance
    const results = scored
      .filter(s => s._relevance > 0)
      .sort((a, b) => b._relevance - a._relevance)
      .slice(0, 10)
      .map(s => ({
        id: s.id,
        summary: s.summary,
        themes: s.themes,
        entities: s.entities,
        relationships: s.relationships,
        retrieval_hints: s.retrieval_hints,
        source_memory_count: (s.source_memory_ids || []).length,
        relevance_score: s._relevance,
        created_date: s.created_date
      }));

    return Response.json({
      results,
      total_searched: syntheses.length,
      query,
      message: results.length > 0
        ? `Found ${results.length} relevant synthesis bundles`
        : `No synthesis bundles matched "${query}"`
    });
  } catch (error) {
    console.error('[searchSynthesis] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});