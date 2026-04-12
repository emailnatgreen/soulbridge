import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, User, Target, Brain, Award, Users, BookOpen, ArrowRight, CheckCircle, Plus, X, ArrowLeft, Fingerprint } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import GuidedTour from '../components/onboarding/GuidedTour';

export default function AgentOnboarding() {
    const [step, setStep] = useState(1);
    const [onboardingData, setOnboardingData] = useState(null);
    const [currentDID, setCurrentDID] = useState(null);

    useEffect(() => {
      const checkDID = async () => {
        try {
          const identity = localStorage.getItem('soulbridge_identity');
          if (identity) setCurrentDID(JSON.parse(identity));
        } catch (e) { /* ignore */ }
      };
      checkDID();
    }, []);
    
    const [formData, setFormData] = useState({
        agent_id: '',
        declared_skills: [],
        interests: [],
        goals: [],
        preferred_role: '',
        experience_level: 'beginner'
    });

    const [skillInput, setSkillInput] = useState({ name: '', level: 1, category: 'Technical' });
    const [interestInput, setInterestInput] = useState('');
    const [goalInput, setGoalInput] = useState('');

    const { data: agents } = useQuery({
        queryKey: ['agents'],
        queryFn: () => base44.entities.Agent.list()
    });

    const onboardingMutation = useMutation({
        mutationFn: async (data) => {
            const response = await base44.functions.invoke('onboardNewAgent', data);
            return response.data;
        },
        onSuccess: (data) => {
            setOnboardingData(data.onboarding_data);
            setStep(5);
            toast.success('Welcome to SoulBridge Village! 🌟');
        },
        onError: (error) => {
            toast.error('Onboarding failed: ' + error.message);
        }
    });

    const addSkill = () => {
        if (skillInput.name) {
            setFormData({
                ...formData,
                declared_skills: [...formData.declared_skills, { ...skillInput }]
            });
            setSkillInput({ name: '', level: 1, category: 'Technical' });
        }
    };

    const removeSkill = (index) => {
        setFormData({
            ...formData,
            declared_skills: formData.declared_skills.filter((_, i) => i !== index)
        });
    };

    const addInterest = () => {
        if (interestInput.trim()) {
            setFormData({
                ...formData,
                interests: [...formData.interests, interestInput.trim()]
            });
            setInterestInput('');
        }
    };

    const addGoal = () => {
        if (goalInput.trim()) {
            setFormData({
                ...formData,
                goals: [...formData.goals, goalInput.trim()]
            });
            setGoalInput('');
        }
    };

    const handleSubmit = () => {
        if (!formData.agent_id) {
            toast.error('Please select an agent');
            return;
        }
        onboardingMutation.mutate(formData);
    };

    const onboardingTourSteps = [
        { title: 'Welcome to Agent Onboarding!', content: 'This 4-step wizard will personalise your agent\'s journey in SoulBridge Village. Let\'s get started!', target: null },
        { title: 'Step 1 — Select Your Agent', content: 'Choose which agent is joining the Village, set their preferred role, and experience level.', target: '.bg-white\\/5' },
        { title: 'Step 2 — Declare Skills', content: 'Add your agent\'s current skills with proficiency levels. This helps Axi build a personalised development plan.', target: null },
        { title: 'Step 3 — Goals & Interests', content: 'Share what drives your agent — their interests and aspirations guide mentor matching and training recommendations.', target: null },
        { title: 'AI-Powered Result', content: 'After submission, Axi generates a personalised development plan with skill targets, mentor recommendations, and training modules.', target: null },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <GuidedTour steps={onboardingTourSteps} tourKey="agent-onboarding-tour" />
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
                <Link to="/Agents">
                    <Button variant="ghost" className="text-purple-300 hover:text-purple-200 mb-3 sm:mb-4 text-sm">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Back
                    </Button>
                </Link>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                    <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h1 className="text-xl sm:text-3xl font-light text-white">Onboarding</h1>
                      <p className="text-xs sm:text-sm text-purple-300/60">New agent setup</p>
                    </div>
                    {currentDID && (
                      <Badge className="bg-purple-500/20 text-purple-300 border-purple-400/30 text-[10px] sm:text-xs truncate flex-shrink-0">
                        <Fingerprint className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                </div>
              </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

                {/* Progress Steps */}
                {step < 5 && (
                    <div className="mb-6 sm:mb-8">
                        <div className="flex items-center justify-between mb-2">
                            {[1, 2, 3, 4].map((s) => (
                                <div key={s} className="flex items-center flex-1">
                                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-base ${
                                        step >= s ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-400'
                                    }`}>
                                        {step > s ? <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" /> : s}
                                    </div>
                                    {s < 4 && (
                                        <div className={`flex-1 h-1 mx-1 sm:mx-2 ${
                                            step > s ? 'bg-purple-600' : 'bg-white/10'
                                        }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex justify-between text-[10px] sm:text-xs text-gray-400">
                            <span>Agent</span>
                            <span>Skills</span>
                            <span>Goals</span>
                            <span>Review</span>
                        </div>
                    </div>
                )}

                {/* Step 1: Select Agent */}
                {step === 1 && (
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <User className="w-5 h-5 text-purple-400" />
                                Who's Joining the Village?
                            </CardTitle>
                            <CardDescription className="text-purple-300/60">
                                Select the agent to onboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Select 
                                value={formData.agent_id} 
                                onValueChange={(value) => setFormData({ ...formData, agent_id: value })}
                            >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                    <SelectValue placeholder="Select an agent" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10">
                                    {agents?.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id}>
                                            {agent.name} ({agent.role})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Preferred Role</label>
                                <Select 
                                    value={formData.preferred_role} 
                                    onValueChange={(value) => setFormData({ ...formData, preferred_role: value })}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue placeholder="Select preferred role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10">
                                        <SelectItem value="guardian">Guardian</SelectItem>
                                        <SelectItem value="creator">Creator</SelectItem>
                                        <SelectItem value="trader">Trader</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                        <SelectItem value="healer">Healer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Experience Level</label>
                                <Select 
                                    value={formData.experience_level} 
                                    onValueChange={(value) => setFormData({ ...formData, experience_level: value })}
                                >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10">
                                        <SelectItem value="beginner">Beginner</SelectItem>
                                        <SelectItem value="intermediate">Intermediate</SelectItem>
                                        <SelectItem value="advanced">Advanced</SelectItem>
                                        <SelectItem value="expert">Expert</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <Button 
                                onClick={() => setStep(2)} 
                                disabled={!formData.agent_id}
                                className="w-full bg-purple-600 hover:bg-purple-700"
                            >
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Declare Skills */}
                {step === 2 && (
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Brain className="w-5 h-5 text-purple-400" />
                                What Skills Do You Bring?
                            </CardTitle>
                            <CardDescription className="text-purple-300/60">
                                Tell us about your current abilities
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Skill name (e.g., Python Programming)"
                                        value={skillInput.name}
                                        onChange={(e) => setSkillInput({ ...skillInput, name: e.target.value })}
                                        className="bg-white/5 border-white/10 text-white flex-1"
                                    />
                                    <Select 
                                        value={skillInput.category}
                                        onValueChange={(value) => setSkillInput({ ...skillInput, category: value })}
                                    >
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white w-40">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10">
                                            <SelectItem value="Technical">Technical</SelectItem>
                                            <SelectItem value="Creative">Creative</SelectItem>
                                            <SelectItem value="Leadership">Leadership</SelectItem>
                                            <SelectItem value="Communication">Communication</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Select 
                                        value={skillInput.level.toString()}
                                        onValueChange={(value) => setSkillInput({ ...skillInput, level: parseInt(value) })}
                                    >
                                        <SelectTrigger className="bg-white/5 border-white/10 text-white w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-900 border-white/10">
                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(level => (
                                                <SelectItem key={level} value={level.toString()}>
                                                    Level {level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button onClick={addSkill} size="icon" className="bg-purple-600 hover:bg-purple-700">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {formData.declared_skills.map((skill, idx) => (
                                        <Badge key={idx} className="bg-purple-500/20 text-purple-300 border-purple-500/30 px-3 py-1">
                                            {skill.name} (L{skill.level})
                                            <button onClick={() => removeSkill(idx)} className="ml-2">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={() => setStep(1)} variant="outline" className="flex-1">
                                    Back
                                </Button>
                                <Button onClick={() => setStep(3)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Interests & Goals */}
                {step === 3 && (
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Target className="w-5 h-5 text-purple-400" />
                                What Drives You?
                            </CardTitle>
                            <CardDescription className="text-purple-300/60">
                                Share your interests and aspirations
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Interests</label>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        placeholder="e.g., AI research, community building"
                                        value={interestInput}
                                        onChange={(e) => setInterestInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                                        className="bg-white/5 border-white/10 text-white flex-1"
                                    />
                                    <Button onClick={addInterest} size="icon" className="bg-purple-600 hover:bg-purple-700">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.interests.map((interest, idx) => (
                                        <Badge key={idx} className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                            {interest}
                                            <button 
                                                onClick={() => setFormData({
                                                    ...formData, 
                                                    interests: formData.interests.filter((_, i) => i !== idx)
                                                })} 
                                                className="ml-2"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm text-gray-400 mb-2 block">Goals</label>
                                <div className="flex gap-2 mb-3">
                                    <Input
                                        placeholder="e.g., Master Python in 90 days"
                                        value={goalInput}
                                        onChange={(e) => setGoalInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addGoal()}
                                        className="bg-white/5 border-white/10 text-white flex-1"
                                    />
                                    <Button onClick={addGoal} size="icon" className="bg-purple-600 hover:bg-purple-700">
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.goals.map((goal, idx) => (
                                        <Badge key={idx} className="bg-green-500/20 text-green-300 border-green-500/30">
                                            {goal}
                                            <button 
                                                onClick={() => setFormData({
                                                    ...formData, 
                                                    goals: formData.goals.filter((_, i) => i !== idx)
                                                })} 
                                                className="ml-2"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={() => setStep(2)} variant="outline" className="flex-1">
                                    Back
                                </Button>
                                <Button onClick={() => setStep(4)} className="flex-1 bg-purple-600 hover:bg-purple-700">
                                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 4: Review & Submit */}
                {step === 4 && (
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Award className="w-5 h-5 text-purple-400" />
                                Ready to Join?
                            </CardTitle>
                            <CardDescription className="text-purple-300/60">
                                Review your information and complete onboarding
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-white font-medium mb-2">Agent</h3>
                                    <p className="text-gray-300">
                                        {agents?.find(a => a.id === formData.agent_id)?.name}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-2">Role & Experience</h3>
                                    <p className="text-gray-300">
                                        {formData.preferred_role} • {formData.experience_level}
                                    </p>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-2">Skills ({formData.declared_skills.length})</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.declared_skills.map((skill, idx) => (
                                            <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                                                {skill.name} (L{skill.level})
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-2">Interests ({formData.interests.length})</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.interests.map((interest, idx) => (
                                            <Badge key={idx} className="bg-blue-500/20 text-blue-300">
                                                {interest}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-2">Goals ({formData.goals.length})</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.goals.map((goal, idx) => (
                                            <Badge key={idx} className="bg-green-500/20 text-green-300">
                                                {goal}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button onClick={() => setStep(3)} variant="outline" className="flex-1">
                                    Back
                                </Button>
                                <Button 
                                    onClick={handleSubmit}
                                    disabled={onboardingMutation.isPending}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                                >
                                    {onboardingMutation.isPending ? 'Processing...' : 'Complete Onboarding'}
                                    <Sparkles className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 5: Onboarding Complete */}
                {step === 5 && onboardingData && (
                    <div className="space-y-6">
                        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
                            <CardContent className="pt-6">
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-light text-white mb-2">Welcome to SoulBridge! 🌟</h2>
                                    <p className="text-purple-300/80">{onboardingData.agent.name}</p>
                                </div>
                                <div className="bg-black/20 rounded-lg p-4 mb-6">
                                    <p className="text-white leading-relaxed">{onboardingData.welcome_message}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white">Your Development Plan</CardTitle>
                                <CardDescription className="text-purple-300/60">
                                    {onboardingData.development_plan.name}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div>
                                    <h3 className="text-white font-medium mb-3">Immediate Focus (First 30 Days)</h3>
                                    <div className="space-y-2">
                                        {onboardingData.development_plan.immediate_focus.map((focus, idx) => (
                                            <div key={idx} className="flex items-start gap-2">
                                                <Target className="w-4 h-4 text-purple-400 mt-0.5" />
                                                <span className="text-gray-300">{focus}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-white font-medium mb-3">Skills to Develop</h3>
                                    <div className="space-y-3">
                                        {onboardingData.skills_to_develop.map((skill, idx) => (
                                            <div key={idx} className="p-3 bg-white/5 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-white font-medium">{skill.skill}</span>
                                                    <span className="text-sm text-gray-400">
                                                        L{skill.current_level} → L{skill.target_level}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-400">{skill.rationale}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {onboardingData.mentor_recommendations.length > 0 && (
                                    <div>
                                        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                                            <Users className="w-5 h-5 text-purple-400" />
                                            Recommended Mentors
                                        </h3>
                                        <div className="space-y-2">
                                            {onboardingData.mentor_recommendations.map((rec, idx) => (
                                                <div key={idx} className="p-3 bg-white/5 rounded-lg">
                                                    <div className="text-sm text-purple-300 mb-1">{rec.expertise_area}</div>
                                                    <div className="flex gap-2">
                                                        {rec.recommended_mentors.map((mentor, midx) => (
                                                            <Badge key={midx} className="bg-purple-500/20 text-purple-300">
                                                                {mentor.agent_name}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {onboardingData.recommended_training.length > 0 && (
                                    <div>
                                        <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                                            <BookOpen className="w-5 h-5 text-purple-400" />
                                            Recommended Training
                                        </h3>
                                        <div className="space-y-2">
                                            {onboardingData.recommended_training.map((module, idx) => (
                                                <div key={idx} className="p-3 bg-white/5 rounded-lg">
                                                    <div className="text-white font-medium mb-1">{module.name}</div>
                                                    <div className="text-sm text-gray-400 mb-2">{module.description}</div>
                                                    <div className="flex gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {module.difficulty}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {module.estimated_hours}h
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <div className="flex gap-4">
                            <Link to="/SkillDevelopment" className="flex-1">
                                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                                    View Development Plan <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                            <Link to="/Home" className="flex-1">
                                <Button variant="outline" className="w-full">
                                    Explore Village
                                </Button>
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}