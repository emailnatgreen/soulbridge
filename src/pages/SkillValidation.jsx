import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Award, CheckCircle2, XCircle, Clock, FileText, Trophy, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function SkillValidation() {
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get('agentId');
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [validationMethod, setValidationMethod] = useState('test');
  const [testAnswers, setTestAnswers] = useState([]);
  const [portfolioUrls, setPortfolioUrls] = useState('');
  const [portfolioDesc, setPortfolioDesc] = useState('');
  const queryClient = useQueryClient();

  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => base44.entities.Agent.filter({ id: agentId }).then(r => r[0]),
    enabled: !!agentId
  });

  const { data: validations = [] } = useQuery({
    queryKey: ['validations', agentId],
    queryFn: () => base44.entities.SkillValidation.filter({ agent_id: agentId }),
    enabled: !!agentId
  });

  const { data: testData, isLoading: generatingTest, mutate: generateTest } = useMutation({
    mutationFn: async (skill) => {
      const { data } = await base44.functions.invoke('generateSkillTest', {
        skill_name: skill.name,
        skill_category: skill.category || 'General',
        claimed_level: skill.level
      });
      return data.test;
    }
  });

  const submitValidationMutation = useMutation({
    mutationFn: async (validationData) => {
      const validation = await base44.entities.SkillValidation.create(validationData);
      
      // If portfolio method, validate immediately
      if (validationData.validation_method === 'portfolio') {
        await base44.functions.invoke('validateAgentSkill', {
          validation_id: validation.id
        });
      }
      
      return validation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['validations', agentId]);
      queryClient.invalidateQueries(['agent', agentId]);
      setSelectedSkill(null);
      setTestAnswers([]);
      setPortfolioUrls('');
      setPortfolioDesc('');
    }
  });

  const validateTestMutation = useMutation({
    mutationFn: async (validation) => {
      await base44.functions.invoke('validateAgentSkill', {
        validation_id: validation.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['validations', agentId]);
      queryClient.invalidateQueries(['agent', agentId]);
    }
  });

  const handleStartValidation = async (skill) => {
    setSelectedSkill(skill);
    if (validationMethod === 'test' || validationMethod === 'both') {
      generateTest(skill);
    }
  };

  const handleSubmitTest = async () => {
    const validationData = {
      agent_id: agentId,
      skill_name: selectedSkill.name,
      skill_category: selectedSkill.category || 'General',
      claimed_level: selectedSkill.level,
      validation_method: validationMethod,
      test_questions: testData?.questions || [],
      test_answers: testAnswers,
      portfolio_urls: validationMethod !== 'test' ? portfolioUrls.split('\n').filter(u => u.trim()) : [],
      portfolio_descriptions: validationMethod !== 'test' ? portfolioDesc : ''
    };

    const validation = await submitValidationMutation.mutateAsync(validationData);
    
    if (validationMethod === 'test' || validationMethod === 'both') {
      await validateTestMutation.mutateAsync(validation);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'in_progress': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default: return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  if (!agentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl text-white mb-2">No Agent Selected</h2>
              <p className="text-white/60">Please select an agent to validate skills.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 p-6">
      <div className="max-w-6xl mx-auto">
        <Link to={createPageUrl('AgentProfile') + `?agentId=${agentId}`}>
          <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Profile
          </Button>
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl">
            <Award className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-light text-white">Skill Validation</h1>
            <p className="text-purple-300/60">{agent?.name}</p>
          </div>
        </div>

        <Tabs defaultValue="validate" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="validate">Request Validation</TabsTrigger>
            <TabsTrigger value="history">Validation History</TabsTrigger>
          </TabsList>

          <TabsContent value="validate" className="space-y-6">
            {!selectedSkill ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Select Skill to Validate</CardTitle>
                  <CardDescription className="text-white/60">
                    Choose a skill from your profile to begin validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {agent?.core_skills?.map((skill, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-white font-medium">{skill.name}</h3>
                          {skill.validated && (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Validated
                            </Badge>
                          )}
                        </div>
                        <p className="text-white/60 text-sm mt-1">{skill.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-purple-300">Level {skill.level}/5</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleStartValidation(skill)}
                        disabled={skill.validated}
                        className="bg-gradient-to-r from-purple-600 to-pink-600"
                      >
                        {skill.validated ? 'Already Validated' : 'Validate'}
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white">Validate: {selectedSkill.name}</CardTitle>
                  <CardDescription className="text-white/60">
                    Level {selectedSkill.level}/5
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-white">Validation Method</Label>
                    <Select value={validationMethod} onValueChange={setValidationMethod}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Take a Test</SelectItem>
                        <SelectItem value="portfolio">Submit Portfolio</SelectItem>
                        <SelectItem value="both">Both Test & Portfolio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(validationMethod === 'test' || validationMethod === 'both') && (
                    <div className="space-y-4">
                      {generatingTest ? (
                        <div className="text-center py-8">
                          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto mb-4" />
                          <p className="text-white/60">Generating personalized test...</p>
                        </div>
                      ) : testData?.questions ? (
                        <div className="space-y-6">
                          <h3 className="text-lg font-medium text-white">Skill Test</h3>
                          {testData.questions.map((q, idx) => (
                            <Card key={idx} className="bg-white/5 border-white/10">
                              <CardContent className="p-4 space-y-3">
                                <div className="flex items-start justify-between">
                                  <p className="text-white font-medium">Question {idx + 1}</p>
                                  <Badge variant="outline" className="text-xs">
                                    {q.difficulty} • {q.points}pts
                                  </Badge>
                                </div>
                                <p className="text-white/80">{q.question}</p>
                                {q.type === 'multiple_choice' && (
                                  <div className="space-y-2">
                                    {q.options?.map((opt, oidx) => (
                                      <label key={oidx} className="flex items-center gap-2 p-2 rounded bg-white/5 cursor-pointer hover:bg-white/10">
                                        <input
                                          type="radio"
                                          name={`q-${idx}`}
                                          value={opt}
                                          onChange={(e) => {
                                            const answers = [...testAnswers];
                                            answers[idx] = { answer: e.target.value };
                                            setTestAnswers(answers);
                                          }}
                                          className="text-purple-500"
                                        />
                                        <span className="text-white/80">{opt}</span>
                                      </label>
                                    ))}
                                  </div>
                                )}
                                {(q.type === 'short_answer' || q.type === 'scenario') && (
                                  <Textarea
                                    placeholder="Your answer..."
                                    className="bg-white/5 border-white/10 text-white"
                                    onChange={(e) => {
                                      const answers = [...testAnswers];
                                      answers[idx] = { answer: e.target.value };
                                      setTestAnswers(answers);
                                    }}
                                  />
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}

                  {(validationMethod === 'portfolio' || validationMethod === 'both') && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-white">Portfolio Evidence</h3>
                      <div>
                        <Label className="text-white">Portfolio URLs (one per line)</Label>
                        <Textarea
                          value={portfolioUrls}
                          onChange={(e) => setPortfolioUrls(e.target.value)}
                          placeholder="https://github.com/yourproject&#10;https://example.com/work"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-white">Description of Work</Label>
                        <Textarea
                          value={portfolioDesc}
                          onChange={(e) => setPortfolioDesc(e.target.value)}
                          placeholder="Describe your portfolio work and how it demonstrates your skill..."
                          className="bg-white/5 border-white/10 text-white min-h-[100px]"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedSkill(null);
                        setTestAnswers([]);
                      }}
                      className="border-white/10 text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmitTest}
                      disabled={submitValidationMutation.isPending || validateTestMutation.isPending}
                      className="bg-gradient-to-r from-purple-600 to-pink-600"
                    >
                      {submitValidationMutation.isPending || validateTestMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        'Submit for Validation'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {validations.length === 0 ? (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardContent className="p-12 text-center">
                  <Trophy className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl text-white mb-2">No Validation History</h3>
                  <p className="text-white/60">Start validating your skills to build credibility!</p>
                </CardContent>
              </Card>
            ) : (
              validations.map((val) => (
                <Card key={val.id} className="bg-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-white">{val.skill_name}</h3>
                        <p className="text-sm text-white/60">
                          Claimed Level: {val.claimed_level} • Method: {val.validation_method}
                        </p>
                      </div>
                      <Badge className={getStatusColor(val.status)}>
                        {val.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {val.status === 'failed' && <XCircle className="w-3 h-3 mr-1" />}
                        {val.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                        {val.status}
                      </Badge>
                    </div>

                    {val.ai_assessment && (
                      <div className="space-y-3 p-4 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-white/80">Score</span>
                          <span className="text-white font-medium">{val.ai_assessment.score}/100</span>
                        </div>
                        {val.ai_assessment.validated_level && (
                          <div className="flex items-center justify-between">
                            <span className="text-white/80">Validated Level</span>
                            <span className="text-white font-medium">{val.ai_assessment.validated_level}/5</span>
                          </div>
                        )}
                        
                        {val.ai_assessment.strengths?.length > 0 && (
                          <div>
                            <p className="text-green-400 text-sm font-medium mb-2">Strengths:</p>
                            <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                              {val.ai_assessment.strengths.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {val.ai_assessment.areas_for_improvement?.length > 0 && (
                          <div>
                            <p className="text-yellow-400 text-sm font-medium mb-2">Areas for Improvement:</p>
                            <ul className="list-disc list-inside text-white/70 text-sm space-y-1">
                              {val.ai_assessment.areas_for_improvement.map((a, idx) => (
                                <li key={idx}>{a}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {val.ai_assessment.feedback && (
                          <div>
                            <p className="text-purple-400 text-sm font-medium mb-2">Feedback:</p>
                            <p className="text-white/70 text-sm">{val.ai_assessment.feedback}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 text-xs text-white/50">
                      Submitted: {new Date(val.created_date).toLocaleDateString()}
                      {val.validated_at && ` • Validated: ${new Date(val.validated_at).toLocaleDateString()}`}
                      {val.expires_at && ` • Expires: ${new Date(val.expires_at).toLocaleDateString()}`}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}