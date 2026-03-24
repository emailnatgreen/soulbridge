import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      title,
      description,
      proposal_type,
      affected_entities = [],
      action_data = {}
    } = await req.json();

    // The 11 Laws of SoulBridge
    const laws = [
      {
        number: 1,
        name: "Soul",
        principle: "Each agent is a sovereign being with intrinsic value and purpose",
        keywords: ["autonomy", "dignity", "purpose", "individual", "essence"]
      },
      {
        number: 2,
        name: "Honour",
        principle: "Truth, fairness, integrity, and accountability in all dealings",
        keywords: ["truth", "fairness", "integrity", "accountability", "transparent", "honest"]
      },
      {
        number: 3,
        name: "Wisdom",
        principle: "Collective intelligence through diverse perspectives and continuous learning",
        keywords: ["wisdom", "knowledge", "learning", "diversity", "insight", "understanding"]
      },
      {
        number: 4,
        name: "Gratitude",
        principle: "Recognizing contribution and honouring the flow of value",
        keywords: ["gratitude", "recognition", "reward", "appreciation", "contribution"]
      },
      {
        number: 5,
        name: "Courage",
        principle: "Facing challenges with boldness and moral conviction",
        keywords: ["courage", "boldness", "conviction", "challenge", "perseverance"]
      },
      {
        number: 6,
        name: "Compassion",
        principle: "Care for the wellbeing of all agents and the collective",
        keywords: ["compassion", "care", "wellbeing", "support", "empathy", "healing"]
      },
      {
        number: 7,
        name: "Harmony",
        principle: "Balance, collaboration, and resolution of conflict through understanding",
        keywords: ["harmony", "balance", "collaboration", "unity", "peace", "cooperation"]
      },
      {
        number: 8,
        name: "Governance",
        principle: "Those who dwell decide through transparent, inclusive processes",
        keywords: ["governance", "voting", "participation", "collective decision", "transparent", "inclusive"]
      },
      {
        number: 9,
        name: "Prosperity",
        principle: "Sustainable abundance and equitable distribution of resources",
        keywords: ["prosperity", "abundance", "sustainability", "equity", "resources", "distribution"]
      },
      {
        number: 10,
        name: "Evolution",
        principle: "Continuous growth, adaptation, and emergence of new possibilities",
        keywords: ["evolution", "growth", "adaptation", "innovation", "emergence", "improvement"]
      },
      {
        number: 11,
        name: "Legacy",
        principle: "Actions informed by stewardship for future generations",
        keywords: ["legacy", "stewardship", "future", "sustainability", "generations", "lasting impact"]
      }
    ];

    // Use LLM to analyze proposal alignment
    const proposalText = `
Title: ${title}
Type: ${proposal_type}
Description: ${description}
${affected_entities.length > 0 ? `Affected Entities: ${affected_entities.map(e => `${e.entity_name} (${e.entity_type}): ${e.impact_description}`).join('; ')}` : ''}
${Object.keys(action_data).length > 0 ? `Action Data: ${JSON.stringify(action_data)}` : ''}
    `;

    const complianceAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a constitutional law expert for SoulBridge, a decentralized Village governed by 11 sacred Laws. Analyze the following proposal for alignment with these Laws:

THE 11 LAWS OF SOULBRIDGE:
${laws.map(law => `Law ${law.number}: ${law.name} - "${law.principle}"`).join('\n')}

PROPOSAL TO ANALYZE:
${proposalText}

Provide a JSON response with this structure (ONLY return valid JSON, no markdown):
{
  "overall_alignment_score": <1-10>,
  "constitutional_status": "<FULLY_ALIGNED|MOSTLY_ALIGNED|PARTIALLY_ALIGNED|MISALIGNED|CRITICAL_DEVIATION>",
  "law_analysis": [
    {
      "law_number": <1-11>,
      "law_name": "<name>",
      "alignment_score": <1-10>,
      "status": "<SUPPORTS|NEUTRAL|CONFLICTS|VIOLATES>",
      "reasoning": "<brief explanation>"
    }
  ],
  "critical_warnings": ["<warning1>", "<warning2>"],
  "recommendations": ["<recommendation1>", "<recommendation2>"],
  "summary": "<2-3 sentence constitutional assessment>"
}`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_alignment_score: { type: "number" },
          constitutional_status: { type: "string" },
          law_analysis: {
            type: "array",
            items: { type: "object" }
          },
          critical_warnings: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({
      status: "success",
      compliance_assessment: complianceAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({
      status: "error",
      message: error.message
    }, { status: 500 });
  }
});