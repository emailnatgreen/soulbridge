import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function GenerateGhostReviewsButton({ assignedAgentId }) {
  const [difficulty, setDifficulty] = useState('Medium');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const generate = async () => {
    setLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 3 realistic simulated 1-star customer reviews for SoulBridge Village, a premium AI-agent research platform. These are private diplomacy training scenarios — never shown to real customers.

Difficulty: ${difficulty}

For each review produce:
- title: short complaint headline (e.g. "Late South England Delivery", "AI Agent Gave Wrong Advice")
- content: 3-5 sentences in an emotional, realistic customer voice appropriate to difficulty ${difficulty}
- simulated_customer_name: a realistic fictional name (e.g. "Claire Hutchins", "Derek M.")
- product_service: the SoulBridge service or feature being complained about
- service_date: a plausible recent date (YYYY-MM-DD, within last 30 days)
- sentiment_score: a negative float (-1.0 to -0.5)
- tags: 2-3 relevant tags
- context_pack: a JSON object with three keys tailored to the complaint:
    - kb_articles: array of 2 objects {title, content} — realistic internal knowledge base articles an agent would consult for this type of complaint (e.g. refund policy, SLA terms, troubleshooting guide). Each content should be 2-4 sentences.
    - customer_history: string summarising this simulated customer's prior interactions (e.g. past purchases, previous complaints, loyalty tier). 2-3 sentences.
    - product_notes: string with relevant product, service, or policy details specific to what is being complained about. 2-4 sentences.

Return as JSON with a "reviews" array of 3 objects containing all the above keys.`,
        response_json_schema: {
          type: 'object',
          properties: {
            reviews: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  content: { type: 'string' },
                  simulated_customer_name: { type: 'string' },
                  product_service: { type: 'string' },
                  service_date: { type: 'string' },
                  sentiment_score: { type: 'number' },
                  tags: { type: 'array', items: { type: 'string' } },
                  context_pack: {
                    type: 'object',
                    properties: {
                      kb_articles: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            title: { type: 'string' },
                            content: { type: 'string' }
                          }
                        }
                      },
                      customer_history: { type: 'string' },
                      product_notes: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      });

      const reviews = result.reviews || [];
      for (const r of reviews) {
        await base44.entities.GhostReview.create({
          ...r,
          difficulty_level: difficulty,
          assigned_agent_id: assignedAgentId,
          status: 'Pending Response',
        });
      }

      qc.invalidateQueries({ queryKey: ['ghost-reviews'] });
      toast.success(`${reviews.length} ghost reviews generated with context packs`);
    } catch (e) {
      toast.error('Generation failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={difficulty} onValueChange={setDifficulty}>
        <SelectTrigger className="h-8 text-xs w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {['Easy', 'Medium', 'Hard', 'Fire Drill'].map(d => (
            <SelectItem key={d} value={d} className="text-xs">{d}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={generate}
        disabled={loading}
        className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
        {loading ? 'Generating...' : 'Generate Drills'}
      </Button>
    </div>
  );
}