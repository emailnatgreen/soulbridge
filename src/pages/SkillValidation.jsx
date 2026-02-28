import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Shield, Star, CheckCircle, XCircle, Clock, Award, Loader2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function SkillValidation() {
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [validationForm, setValidationForm] = useState({
    skill_name: '',
    claimed_level: 3,
    validation_method: 'test',
    portfolio_urls: [],
    portfolio_descriptions: ''
  });
  const [testInProgress, setTestInProgress] = useState(null);
  const [testAnswers, setTestAnswers] = useState({});
  const queryClient = useQueryClient();

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list()
  });

  const { data: validations = [] } = useQuery({
    queryKey: ['skill-validations', selectedAgentId],
    queryFn: () => base44.entities.SkillValidation.filter(
      selectedAgentId ? { agent_id: selectedAgentId } : {},
      '-created_date'
    )
  });

  const generateTestMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('generateSkillTest', data),
    onSuccess: (response) => {
      setTestInProgress(response.data);
      toast.success('Test generated! Answer the questions.');
    }
  });

  const submitValidationMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('validateAgentSkill', data),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['skill-validations']);
      setValidationForm({
        skill_name: '',
        claimed_level: 3,
        validation_method: 'test',
        portfolio_urls: [],
        portfolio_descriptions: ''
      });
      setTestInProgress(null);
      setTestAnswers({});
      const passed = response.data?.passed;
      if (passed) {
        toast.success('Skill Validated! A Verifiable Credential has been issued to the agent.');
      } else {
        toast.error('Validation not passed. Review the feedback and try again.');
      }
    }
  });

  const handleStartValidation = () => {
    if (!selectedAgentId || !validationForm.skill_name) {
      toast.error('Please select an agent and enter a skill name');
      return;
    }

    if (validationForm.validation_method === 'test' || validationForm.validation_method === 'both') {
      generateTestMutation.mutate({
        skill_name: validationForm.skill_name,
        claimed_level: validationForm.claimed_level
      });
    } else {
      submitValidationMutation.mutate({
        agent_id: selectedAgentId,
        ...validationForm
      });
    }
  };

  const pendingValidations = validations.filter(v => v.status === 'pending' || v.status === 'in_progress');
  const completedValidations = validations.filter(v => v.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-light text-white flex items-center gap-2">
                <Shield className="w-7 h-7 text-indigo-400" />
                Skill Validation
              </h1>
              <p className="text-sm text-indigo-300/60">Verify and certify agent competencies</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Total Validations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{validations.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-400">{pendingValidations.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{completedValidations.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-white/60">Pass Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                {completedValidations.length > 0
                  ? Math.round((completedValidations.filter(v => v.ai_assessment?.passed).length / completedValidations.length) * 100)
                  : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Validation Form */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Request Skill Validation</CardTitle>
              <CardDescription className="text-white/60">
                Submit a skill for AI-powered validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-white text-sm mb-2 block">Agent</label>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Select agent..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {agents.map(agent => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Skill Name</label>
                <Input
                  value={validationForm.skill_name}
                  onChange={(e) => setValidationForm({...validationForm, skill_name: e.target.value})}
                  placeholder="e.g., React Development, Data Analysis"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Claimed Proficiency (1-5)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(level => (
                    <button
                      key={level}
                      onClick={() => setValidationForm({...validationForm, claimed_level: level})}
                      className={`flex-1 py-2 rounded border transition-all ${
                        validationForm.claimed_level === level
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white text-sm mb-2 block">Validation Method</label>
                <Select 
                  value={validationForm.validation_method} 
                  onValueChange={(v) => setValidationForm({...validationForm, validation_method: v})}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="test">AI Generated Test</SelectItem>
                    <SelectItem value="portfolio">Portfolio Review</SelectItem>
                    <SelectItem value="both">Both Test & Portfolio</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(validationForm.validation_method === 'portfolio' || validationForm.validation_method === 'both') && (
                <div>
                  <label className="text-white text-sm mb-2 block">Portfolio Description</label>
                  <Textarea
                    value={validationForm.portfolio_descriptions}
                    onChange={(e) => setValidationForm({...validationForm, portfolio_descriptions: e.target.value})}
                    placeholder="Describe your work that demonstrates this skill..."
                    className="bg-white/5 border-white/10 text-white"
                    rows={4}
                  />
                </div>
              )}

              <Button
                onClick={handleStartValidation}
                disabled={!selectedAgentId || !validationForm.skill_name || generateTestMutation.isPending || submitValidationMutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {generateTestMutation.isPending || submitValidationMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Start Validation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Validation History */}
          <Card className="bg-white/5 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Validations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {validations.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-indigo-400 mx-auto mb-4" />
                    <p className="text-white/60">No validations yet</p>
                  </div>
                ) : (
                  validations.map(validation => (
                    <ValidationCard key={validation.id} validation={validation} agents={agents} />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Dialog */}
      {testInProgress && (
        <Dialog open={!!testInProgress} onOpenChange={() => setTestInProgress(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Skill Validation Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-white/70">Answer the following questions to validate your skill:</p>
              {testInProgress.questions?.map((q, idx) => (
                <Card key={idx} className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-sm text-white">Question {idx + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white mb-3">{q.question}</p>
                    <Textarea
                      placeholder="Your answer..."
                      className="bg-white/5 border-white/10 text-white"
                      rows={3}
                      value={testAnswers[idx] || ''}
                      onChange={(e) => setTestAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                    />
                  </CardContent>
                </Card>
              ))}
              <Button
                className="w-full bg-indigo-600"
                disabled={submitValidationMutation.isPending}
                onClick={() => {
                  submitValidationMutation.mutate({
                    validation_id: testInProgress.validation_id,
                    test_answers: testInProgress.questions?.map((q, idx) => ({
                      question: q.question,
                      answer: testAnswers[idx] || ''
                    }))
                  });
                }}
              >
                {submitValidationMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Evaluating...</>
                ) : (
                  <><Award className="w-4 h-4 mr-2" />Submit for AI Assessment</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ValidationCard({ validation, agents }) {
  const agent = agents.find(a => a.id === validation.agent_id);
  
  const statusConfig = {
    pending: { icon: Clock, color: 'bg-yellow-500/20 text-yellow-300', label: 'Pending' },
    in_progress: { icon: Loader2, color: 'bg-blue-500/20 text-blue-300', label: 'In Progress' },
    completed: { 
      icon: validation.ai_assessment?.passed ? CheckCircle : XCircle, 
      color: validation.ai_assessment?.passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300',
      label: validation.ai_assessment?.passed ? 'Passed' : 'Failed'
    },
    failed: { icon: XCircle, color: 'bg-red-500/20 text-red-300', label: 'Failed' }
  };

  const config = statusConfig[validation.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg">{validation.skill_name}</CardTitle>
            <p className="text-sm text-white/60">{agent?.name || 'Unknown Agent'}</p>
          </div>
          <Badge className={config.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Claimed Level</span>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${i < validation.claimed_level ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`}
              />
            ))}
          </div>
        </div>

        {validation.ai_assessment && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">Validated Level</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3 h-3 ${i < validation.ai_assessment.validated_level ? 'text-green-400 fill-green-400' : 'text-white/20'}`}
                  />
                ))}
              </div>
            </div>

            {validation.ai_assessment.score && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Score</span>
                <span className="text-white font-medium">{validation.ai_assessment.score}/100</span>
              </div>
            )}

            {validation.ai_assessment.feedback && (
              <div className="p-3 bg-indigo-500/10 rounded border border-indigo-500/20">
                <p className="text-sm text-indigo-200">{validation.ai_assessment.feedback}</p>
              </div>
            )}
          </>
        )}

        <div className="text-xs text-white/60">
          {new Date(validation.created_date).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}