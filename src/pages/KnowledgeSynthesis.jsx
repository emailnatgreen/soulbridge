import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Brain, Sparkles, TrendingUp, Lightbulb, Network, Target, Eye, ThumbsUp, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

export default function KnowledgeSynthesis() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [selectedSynthesis, setSelectedSynthesis] = useState(null);
  const queryClient = useQueryClient();

  const { data: syntheses = [] } = useQuery({
    queryKey: ['knowledge-syntheses'],
    queryFn: () => base44.entities.KnowledgeSynthesis.list('-created_date')
  });

  const { data: knowledge = [] } = useQuery({
    queryKey: ['knowledge-contributions'],
    queryFn: () => base44.entities.KnowledgeContribution.list()
  });

  const topSyntheses = syntheses.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0)).slice(0, 3);
  const avgRelevance = syntheses.length > 0 
    ? syntheses.reduce((sum, s) => sum + (s.relevance_score || 0), 0) / syntheses.length 
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-light text-white">AI Knowledge Synthesis</h1>
                <p className="text-sm text-purple-300/60">Transform collective wisdom into actionable intelligence</p>
              </div>
            </div>
            <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-purple-600 to-pink-600">
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Synthesis
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Generate AI Knowledge Synthesis</DialogTitle>
                </DialogHeader>
                <GenerateSynthesisForm
                  knowledge={knowledge}
                  onClose={() => setGenerateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Syntheses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{syntheses.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Knowledge Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-400">{knowledge.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Avg Relevance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{avgRelevance.toFixed(1)}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Views</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {syntheses.reduce((sum, s) => sum + (s.view_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Syntheses */}
        {topSyntheses.length > 0 && (
          <div className="mb-8">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-400" />
              Top Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topSyntheses.map((synthesis, idx) => (
                <Card 
                  key={synthesis.id} 
                  className="bg-white/5 backdrop-blur-xl border-white/10 cursor-pointer hover:bg-white/[0.07] transition-all"
                  onClick={() => setSelectedSynthesis(synthesis)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold">
                        #{idx + 1}
                      </div>
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span className="text-white font-medium">{synthesis.relevance_score?.toFixed(1)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg text-white line-clamp-2">{synthesis.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-white/60">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {synthesis.view_count || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-4 h-4" />
                        {synthesis.useful_count || 0}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Syntheses */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600">
              All Syntheses
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-purple-600">
              Trend Analysis
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="data-[state=active]:bg-purple-600">
              Recommendations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {syntheses.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="text-center py-12">
                  <Brain className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">No Syntheses Yet</h3>
                  <p className="text-white/60 mb-6">Generate your first AI-powered knowledge synthesis</p>
                  <Button onClick={() => setGenerateOpen(true)} className="bg-purple-600">
                    <Brain className="w-4 h-4 mr-2" />
                    Generate Synthesis
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {syntheses.map(synthesis => (
                  <SynthesisCard 
                    key={synthesis.id} 
                    synthesis={synthesis}
                    onClick={() => setSelectedSynthesis(synthesis)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trends">
            <TrendsView syntheses={syntheses.filter(s => s.synthesis_type === 'trend_analysis')} />
          </TabsContent>

          <TabsContent value="recommendations">
            <RecommendationsView syntheses={syntheses} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Detail Dialog */}
      {selectedSynthesis && (
        <Dialog open={!!selectedSynthesis} onOpenChange={() => setSelectedSynthesis(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <SynthesisDetail synthesis={selectedSynthesis} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function SynthesisCard({ synthesis, onClick }) {
  const typeColors = {
    trend_analysis: 'bg-blue-500/20 text-blue-300',
    best_practices_summary: 'bg-green-500/20 text-green-300',
    skill_gap_analysis: 'bg-orange-500/20 text-orange-300',
    innovation_opportunities: 'bg-purple-500/20 text-purple-300',
    cross_domain_insights: 'bg-pink-500/20 text-pink-300',
    problem_pattern_recognition: 'bg-red-500/20 text-red-300',
    success_factor_analysis: 'bg-yellow-500/20 text-yellow-300'
  };

  return (
    <Card 
      className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between mb-2">
          <Badge className={typeColors[synthesis.synthesis_type]}>
            {synthesis.synthesis_type.replace(/_/g, ' ')}
          </Badge>
          <div className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span className="text-white font-medium">{synthesis.relevance_score?.toFixed(1)}</span>
          </div>
        </div>
        <CardTitle className="text-xl text-white">{synthesis.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/80 text-sm line-clamp-3">{synthesis.synthesis_content}</p>

        <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/10 text-sm">
          <div>
            <div className="text-white/60 mb-1">Insights</div>
            <div className="text-white font-medium">{synthesis.key_insights?.length || 0}</div>
          </div>
          <div>
            <div className="text-white/60 mb-1">Recommendations</div>
            <div className="text-white font-medium">{synthesis.actionable_recommendations?.length || 0}</div>
          </div>
          <div>
            <div className="text-white/60 mb-1">Connections</div>
            <div className="text-white font-medium">{synthesis.knowledge_connections?.length || 0}</div>
          </div>
        </div>

        {synthesis.skill_areas_covered && synthesis.skill_areas_covered.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {synthesis.skill_areas_covered.slice(0, 3).map(skill => (
              <Badge key={skill} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {synthesis.skill_areas_covered.length > 3 && (
              <Badge variant="outline" className="text-xs text-white/60">
                +{synthesis.skill_areas_covered.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SynthesisDetail({ synthesis }) {
  const queryClient = useQueryClient();

  const markUsefulMutation = useMutation({
    mutationFn: () => base44.entities.KnowledgeSynthesis.update(synthesis.id, {
      useful_count: (synthesis.useful_count || 0) + 1,
      view_count: (synthesis.view_count || 0) + 1
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['knowledge-syntheses']);
      toast.success('Marked as useful!');
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{synthesis.title}</h2>
        <Badge className="bg-purple-500/20 text-purple-300">
          {synthesis.synthesis_type.replace(/_/g, ' ')}
        </Badge>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Synthesis Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-white/80 whitespace-pre-wrap">{synthesis.synthesis_content}</p>
        </CardContent>
      </Card>

      {synthesis.key_insights && synthesis.key_insights.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-400" />
              Key Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {synthesis.key_insights.map((insight, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white flex-1">{insight.insight}</p>
                  <Badge className="bg-green-500/20 text-green-300 ml-2">
                    {insight.confidence}/10
                  </Badge>
                </div>
                {insight.supporting_evidence && insight.supporting_evidence.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-white/60 mb-2">Supporting Evidence:</p>
                    <ul className="space-y-1">
                      {insight.supporting_evidence.map((evidence, i) => (
                        <li key={i} className="text-xs text-white/70 flex items-start gap-2">
                          <span className="text-purple-400 mt-1">•</span>
                          <span>{evidence}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {synthesis.actionable_recommendations && synthesis.actionable_recommendations.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-green-400" />
              Actionable Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {synthesis.actionable_recommendations.map((rec, idx) => (
              <div key={idx} className="p-4 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-white font-medium flex-1">{rec.recommendation}</p>
                  <Badge className={
                    rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                    rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-blue-500/20 text-blue-300'
                  }>
                    {rec.priority}
                  </Badge>
                </div>
                <p className="text-sm text-white/70">Expected Impact: {rec.expected_impact}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {synthesis.knowledge_connections && synthesis.knowledge_connections.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Network className="w-5 h-5 text-blue-400" />
              Knowledge Connections
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {synthesis.knowledge_connections.map((conn, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-white/5 rounded border border-white/10 text-sm">
                <Badge variant="outline">{conn.from_topic}</Badge>
                <span className="text-white/60">{conn.relationship}</span>
                <Badge variant="outline">{conn.to_topic}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {synthesis.emerging_patterns && synthesis.emerging_patterns.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              Emerging Patterns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {synthesis.emerging_patterns.map((pattern, idx) => (
                <li key={idx} className="text-white/80 flex items-start gap-2">
                  <span className="text-purple-400 mt-1">→</span>
                  <span>{pattern}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={() => markUsefulMutation.mutate()}
        disabled={markUsefulMutation.isPending}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
      >
        <ThumbsUp className="w-4 h-4 mr-2" />
        Mark as Useful
      </Button>
    </div>
  );
}

function GenerateSynthesisForm({ knowledge, onClose }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    synthesis_type: 'trend_analysis',
    skill_filter: '',
    category_filter: ''
  });

  const generateMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('synthesizeKnowledge', data),
    onSuccess: async (response) => {
      const synthesis = response.data.synthesis;
      await base44.entities.KnowledgeSynthesis.create(synthesis);
      
      queryClient.invalidateQueries(['knowledge-syntheses']);
      toast.success('Synthesis generated successfully!');
      onClose();
    }
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-white text-sm mb-2 block">Synthesis Type</label>
        <Select value={formData.synthesis_type} onValueChange={(v) => setFormData({...formData, synthesis_type: v})}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10">
            <SelectItem value="trend_analysis">Trend Analysis</SelectItem>
            <SelectItem value="best_practices_summary">Best Practices Summary</SelectItem>
            <SelectItem value="skill_gap_analysis">Skill Gap Analysis</SelectItem>
            <SelectItem value="innovation_opportunities">Innovation Opportunities</SelectItem>
            <SelectItem value="cross_domain_insights">Cross-Domain Insights</SelectItem>
            <SelectItem value="problem_pattern_recognition">Problem Pattern Recognition</SelectItem>
            <SelectItem value="success_factor_analysis">Success Factor Analysis</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-300">
            <p className="font-medium mb-1">AI Synthesis</p>
            <p className="text-blue-300/80">
              The AI will analyze {knowledge.length} knowledge contributions to generate comprehensive insights,
              recommendations, and cross-domain connections.
            </p>
          </div>
        </div>
      </div>

      <Button
        onClick={() => generateMutation.mutate({
          synthesis_type: formData.synthesis_type,
          knowledge_filter: {}
        })}
        disabled={generateMutation.isPending}
        className="w-full bg-purple-600 hover:bg-purple-700"
      >
        {generateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            AI Synthesizing Knowledge...
          </>
        ) : (
          <>
            <Brain className="w-4 h-4 mr-2" />
            Generate Synthesis
          </>
        )}
      </Button>
    </div>
  );
}

function TrendsView({ syntheses }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {syntheses.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="text-center py-12">
            <TrendingUp className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <p className="text-white/60">No trend analyses available yet</p>
          </CardContent>
        </Card>
      ) : (
        syntheses.map(synthesis => (
          <SynthesisCard key={synthesis.id} synthesis={synthesis} />
        ))
      )}
    </div>
  );
}

function RecommendationsView({ syntheses }) {
  const allRecommendations = syntheses
    .flatMap(s => s.actionable_recommendations?.map(r => ({ ...r, synthesisTitle: s.title })) || [])
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });

  return (
    <div className="space-y-3">
      {allRecommendations.length === 0 ? (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="text-center py-12">
            <Target className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <p className="text-white/60">No recommendations available yet</p>
          </CardContent>
        </Card>
      ) : (
        allRecommendations.map((rec, idx) => (
          <Card key={idx} className="bg-white/5 border-white/10">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-3">
                <p className="text-white font-medium flex-1">{rec.recommendation}</p>
                <Badge className={
                  rec.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                  rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-blue-500/20 text-blue-300'
                }>
                  {rec.priority}
                </Badge>
              </div>
              <p className="text-sm text-white/70 mb-2">Impact: {rec.expected_impact}</p>
              <p className="text-xs text-white/50">From: {rec.synthesisTitle}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}