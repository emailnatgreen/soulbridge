import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Shield, Zap, Users } from 'lucide-react';
import AgentPersonalityCard from '../components/AgentPersonalityCard';
import SocialCapitalCard from '../components/SocialCapitalCard';

export default function AgentDetails() {
    const [agent, setAgent] = useState(null);
    const [skills, setSkills] = useState([]);
    const [agentState, setAgentState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [agentId, setAgentId] = useState(null);

    useEffect(() => {
        // Parse ID from the real browser URL, not react-router's view
        const params = new URLSearchParams(window.location.search);
        const id = params.get('id');
        setAgentId(id);

        if (!id) {
            setLoading(false);
            return;
        }

        const load = async () => {
            try {
                const [agents, states, allSkills] = await Promise.all([
                    base44.entities.Agent.list('-created_date', 200),
                    base44.entities.AgentState.list('-created_date', 200),
                    base44.entities.AgentSkill.list('-created_date', 500),
                ]);
                setAgent(agents.find(a => a.id === id) || null);
                setAgentState(states.find(s => s.agent_id === id) || null);
                setSkills(allSkills.filter(s => s.agent_id === id));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="text-white text-lg">Loading agent...</div>
            </div>
        );
    }

    if (!agentId) {
        return <AgentPicker />;
    }

    if (!agent) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="text-center text-white space-y-3">
                    <p className="text-xl">Agent not found</p>
                    <p className="text-white/40 text-sm font-mono">ID: {agentId}</p>
                    <Link to={createPageUrl('Agents')} className="underline text-purple-300">← Back to Agents</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('Agents')}>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                                <h1 className="text-3xl font-light tracking-tight text-white">{agent.name}</h1>
                                <Badge className="capitalize">{agent.role}</Badge>
                                <Badge variant={agent.status === 'active' ? 'default' : 'secondary'}>{agent.status}</Badge>
                            </div>
                            <p className="text-sm text-purple-300/60">{agent.purpose}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Core Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Shield className="w-5 h-5" />
                                    Core Identity
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-white/60 mb-1">Honor Score</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white/10 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                                                style={{ width: `${agent.honor_score || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-white font-medium">{agent.honor_score}</span>
                                    </div>
                                </div>

                                {agent.classic_address && (
                                    <div>
                                        <p className="text-xs text-white/60 mb-1">Classic Address</p>
                                        <p className="text-xs text-white/90 font-mono break-all">{agent.classic_address}</p>
                                    </div>
                                )}

                                {agentState && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                            <div>
                                                <p className="text-xs text-white/60 mb-1">Energy</p>
                                                <p className="text-2xl font-light text-white">{agentState.energy}%</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/60 mb-1">Mood</p>
                                                <p className="text-lg text-white capitalize">{agentState.mood}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-white/60 mb-1">Wisdom</p>
                                                <p className="text-lg text-purple-300">{Math.floor(agentState.wisdom || 0)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/60 mb-1">Experience</p>
                                                <p className="text-lg text-blue-300">{agentState.experience || 0}</p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Zap className="w-5 h-5" />
                                    Skills ({skills.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {skills.slice(0, 8).map((skill) => (
                                        <div key={skill.id} className="flex items-center justify-between">
                                            <span className="text-sm text-white/80">{skill.skill_name}</span>
                                            <Badge variant="outline">Lv {skill.level}</Badge>
                                        </div>
                                    ))}
                                    {skills.length === 0 && (
                                        <p className="text-sm text-white/40">No skills yet</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Middle Column - Personality */}
                    <div className="lg:col-span-1">
                        <AgentPersonalityCard agent={agent} />
                    </div>

                    {/* Right Column - Social */}
                    <div className="lg:col-span-1">
                        <SocialCapitalCard agent_id={agent.id} />
                    </div>
                </div>
            </div>
        </div>
    );
}