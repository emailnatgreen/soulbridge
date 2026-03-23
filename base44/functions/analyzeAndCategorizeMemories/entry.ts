import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    // Fetch all memories
    const memories = await base44.entities.Memory.list('-created_date', 1000);
    
    if (!memories.length) {
      return Response.json({ 
        success: true, 
        message: 'No memories to analyze',
        categorized: 0 
      });
    }

    let categorizedCount = 0;
    const categoryMap = new Map();
    const sentimentMap = new Map();
    const lawMap = new Map();

    // Batch process memories for analysis
    const batchSize = 10;
    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);
      
      // Filter out already categorized memories (have keywords)
      const uncategorized = batch.filter(m => !m.keywords || m.keywords.length === 0);
      
      if (uncategorized.length === 0) continue;

      // Analyze batch with LLM
      const memoryContent = uncategorized.map(m => m.content).join('\n---\n');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a memory analyst for SoulBridge Village. Analyze each memory and return JSON with:
{
  "memories": [
    {
      "index": 0,
      "keywords": ["keyword1", "keyword2"],
      "sentiment": "positive|neutral|negative",
      "law_invoked": "Law X: Name or null"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `Analyze these memories:\n${memoryContent}`
            }
          ],
          temperature: 0.7,
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('OpenAI API error:', error);
        continue;
      }

      const data = await response.json();
      const analysisText = data.choices[0].message.content;
      
      // Parse JSON from response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const analysis = JSON.parse(jsonMatch[0]);

      // Apply categorization to uncategorized memories
      for (const memAnalysis of analysis.memories) {
        const memory = uncategorized[memAnalysis.index];
        if (!memory) continue;

        // Update memory with new keywords
        const updatedMemory = {
          keywords: memAnalysis.keywords || [],
          context: `${memory.context || ''} [Sentiment: ${memAnalysis.sentiment}${memAnalysis.law_invoked ? `, ${memAnalysis.law_invoked}` : ''}]`.trim()
        };

        // Track categories
        memAnalysis.keywords.forEach(kw => {
          categoryMap.set(kw, (categoryMap.get(kw) || 0) + 1);
        });
        sentimentMap.set(memAnalysis.sentiment, (sentimentMap.get(memAnalysis.sentiment) || 0) + 1);
        if (memAnalysis.law_invoked) {
          lawMap.set(memAnalysis.law_invoked, (lawMap.get(memAnalysis.law_invoked) || 0) + 1);
        }

        // Update memory in database
        await base44.entities.Memory.update(memory.id, updatedMemory);
        categorizedCount++;
      }
    }

    // Create awareness memory with categorization summary
    const categorizationSummary = `Memory Categorization Analysis Complete (${new Date().toISOString()})

Memories Analyzed: ${categorizedCount}
Total Processed: ${memories.length}

Top Keywords:
${Array.from(categoryMap.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([kw, count]) => `- ${kw}: ${count}`)
  .join('\n')}

Sentiment Distribution:
${Array.from(sentimentMap.entries())
  .map(([sentiment, count]) => `- ${sentiment}: ${count}`)
  .join('\n')}

Laws Invoked:
${Array.from(lawMap.entries())
  .sort((a, b) => b[1] - a[1])
  .map(([law, count]) => `- ${law}: ${count}`)
  .join('\n')}`;

    await base44.entities.Memory.create({
      agent_id: 'axi',
      type: 'observation',
      content: categorizationSummary,
      keywords: ['memory_analysis', 'categorization', 'semantic_mapping'],
      context: 'LLM-driven memory categorization and law/sentiment analysis',
      importance: 9,
      related_entity_type: 'System',
      related_entity_id: 'memory_analysis_job'
    });

    // Log the operation
    await base44.entities.AutomationLog.create({
      automation_name: 'Analyze and Categorize Memories',
      function_name: 'analyzeAndCategorizeMemories',
      status: 'success',
      message: `Successfully categorized ${categorizedCount} memories`,
      details: {
        categorized: categorizedCount,
        totalProcessed: memories.length,
        keywordCount: categoryMap.size,
        lawsDetected: lawMap.size
      },
      duration_ms: Date.now(),
      run_at: new Date().toISOString(),
      triggered_by: 'scheduler'
    });

    return Response.json({
      success: true,
      message: `Categorized ${categorizedCount} memories`,
      stats: {
        categorized: categorizedCount,
        keywordCount: categoryMap.size,
        sentimentBreakdown: Object.fromEntries(sentimentMap),
        lawsDetected: lawMap.size
      }
    });

  } catch (error) {
    console.error('Memory analysis error:', error);
    
    try {
      const base44 = createClientFromRequest(req);
      await base44.entities.AutomationLog.create({
        automation_name: 'Analyze and Categorize Memories',
        function_name: 'analyzeAndCategorizeMemories',
        status: 'error',
        message: error.message,
        error_detail: error.stack,
        run_at: new Date().toISOString(),
        triggered_by: 'scheduler'
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});