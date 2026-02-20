import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, ArrowDownRight, Wallet, Activity, Plus, MessageCircle, Users, Shield, BarChart3, Map, BookOpen, Sparkles, GraduationCap, ShoppingCart, Target, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import TransactionList from '../components/TransactionList';
import NotificationCenter from '../components/NotificationCenter';

export default function Home() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 50),
  });

  const stats = {
    total: transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    completed: transactions.filter(t => t.status === 'completed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'url(https://chatgpt.com/backend-api/estuary/public_content/enc/eyJpZCI6Im1fNjk5N2E0MzE0ZWY4ODE5MTgzZmNiMWQ0ZDE1MmFjYmI6ZmlsZV8wMDAwMDAwMDI0MmM3MjQzOWRlNTkzY2NkYmJlNDhiZCIsInRzIjoiMjA1MDQiLCJwIjoicHlpIiwiY2lkIjoiMSIsInNpZyI6Ijc1NjZjNDYzYWVjODQxN2VjYjNkMDkwYzUzNTY1M2M0YmU2ZDI2MDBmYTdhNjJiMmNlNmY0OWRhNTAzZGEwZmMiLCJ2IjoiMCIsImdpem1vX2lkIjpudWxsLCJjcyI6bnVsbCwiY2RuIjpudWxsLCJjcCI6bnVsbCwibWEiOm51bGx9)'
        }}
      />
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-white mb-1">
                  Soul<span className="font-semibold">Bridge</span>
                </h1>
                <p className="text-sm text-purple-300/60">XRP Payment Platform</p>
              </div>
              <div className="flex items-center gap-3">
                <NotificationCenter agentId="axi_main_001" />
                <Link to={createPageUrl('Send')}>
                  <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 shadow-lg shadow-purple-500/25 transition-all duration-300">
                    <Plus className="w-4 h-4 mr-2" />
                    Send XRP
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Navigation Menu */}
            <nav className="flex flex-wrap gap-2">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="text-white hover:bg-white/10">
                  Dashboard
                </Button>
              </Link>
              <Link to={createPageUrl('TransactionHistory')}>
                <Button variant="ghost" className="text-white/80 hover:bg-white/10 hover:text-white">
                  <Activity className="w-4 h-4 mr-2" />
                  History
                </Button>
              </Link>
              <Link to={createPageUrl('Wallets')}>
                <Button variant="ghost" className="text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-300">
                  <Wallet className="w-4 h-4 mr-2" />
                  Wallets
                </Button>
              </Link>
              <Link to={createPageUrl('Agents')}>
                <Button variant="ghost" className="text-purple-300/80 hover:bg-purple-500/10 hover:text-purple-300">
                  <Users className="w-4 h-4 mr-2" />
                  Agents
                </Button>
              </Link>
              <Link to={createPageUrl('Axi')}>
                <Button variant="ghost" className="text-blue-300/80 hover:bg-blue-500/10 hover:text-blue-300">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Talk to Axi
                </Button>
              </Link>
              <Link to={createPageUrl('DirectAgentChat')}>
                <Button variant="ghost" className="text-cyan-300/80 hover:bg-cyan-500/10 hover:text-cyan-300">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Direct Chat
                </Button>
              </Link>
              <Link to={createPageUrl('GovernanceHub')}>
                <Button variant="ghost" className="text-purple-300/80 hover:bg-purple-500/10 hover:text-purple-300">
                  <Shield className="w-4 h-4 mr-2" />
                  Governance
                </Button>
              </Link>
              <Link to={createPageUrl('GovernanceSimulation')}>
                <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                  <Shield className="w-4 h-4 mr-2" />
                  Gov Simulation
                </Button>
              </Link>
              <Link to={createPageUrl('Economy')}>
                <Button variant="ghost" className="text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300">
                  <Wallet className="w-4 h-4 mr-2" />
                  Economy
                </Button>
              </Link>
              <Link to={createPageUrl('ResourceMarketplace')}>
                <Button variant="ghost" className="text-green-300/80 hover:bg-green-500/10 hover:text-green-300">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Marketplace
                </Button>
              </Link>
              <Link to={createPageUrl('Village')}>
                <Button variant="ghost" className="text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-300">
                  <Map className="w-4 h-4 mr-2" />
                  Village
                </Button>
              </Link>
              <Link to={createPageUrl('AgentTrainingModule')}>
                <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                  <BookOpen className="w-4 h-4 mr-2" />
                  Training
                </Button>
              </Link>
              <Link to={createPageUrl('TrainingSimulation')}>
                <Button variant="ghost" className="text-pink-300/80 hover:bg-pink-500/10 hover:text-pink-300">
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Train Simulation
                </Button>
              </Link>
              <Link to={createPageUrl('VillageSimulation')}>
                <Button variant="ghost" className="text-pink-300/80 hover:bg-pink-500/10 hover:text-pink-300">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Simulation
                </Button>
              </Link>
              <Link to={createPageUrl('SimulationLab')}>
                <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                  <Activity className="w-4 h-4 mr-2" />
                  Sim Lab
                </Button>
              </Link>
              <Link to={createPageUrl('SocialNetwork')}>
                <Button variant="ghost" className="text-pink-300/80 hover:bg-pink-500/10 hover:text-pink-300">
                  <Users className="w-4 h-4 mr-2" />
                  Social Network
                </Button>
              </Link>
              <Link to={createPageUrl('SocialCapitalDashboard')}>
                <Button variant="ghost" className="text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300">
                  <Activity className="w-4 h-4 mr-2" />
                  Social Capital
                </Button>
              </Link>
              <Link to={createPageUrl('RelationshipNetwork')}>
                <Button variant="ghost" className="text-purple-300/80 hover:bg-purple-500/10 hover:text-purple-300">
                  <Users className="w-4 h-4 mr-2" />
                  Relationships
                </Button>
              </Link>
              <Link to={createPageUrl('AgentSkillTree')}>
                <Button variant="ghost" className="text-yellow-300/80 hover:bg-yellow-500/10 hover:text-yellow-300">
                  <Activity className="w-4 h-4 mr-2" />
                  Skill Trees
                </Button>
              </Link>
              <Link to={createPageUrl('DialogueStudio')}>
                <Button variant="ghost" className="text-cyan-300/80 hover:bg-cyan-500/10 hover:text-cyan-300">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Dialogue Studio
                </Button>
              </Link>
              <Link to={createPageUrl('DiplomacyHub')}>
                <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                  <Shield className="w-4 h-4 mr-2" />
                  Diplomacy
                </Button>
              </Link>
              <Link to={createPageUrl('TaskDelegation')}>
                <Button variant="ghost" className="text-orange-300/80 hover:bg-orange-500/10 hover:text-orange-300">
                  <Activity className="w-4 h-4 mr-2" />
                  Task Delegation
                </Button>
              </Link>
              <Link to={createPageUrl('RLUSDManager')}>
                <Button variant="ghost" className="text-emerald-300/80 hover:bg-emerald-500/10 hover:text-emerald-300">
                  <Wallet className="w-4 h-4 mr-2" />
                  RLUSD Manager
                </Button>
              </Link>
              <Link to={createPageUrl('MainnetMigration')}>
                <Button variant="ghost" className="text-orange-300/80 hover:bg-orange-500/10 hover:text-orange-300">
                  <Activity className="w-4 h-4 mr-2" />
                  Mainnet Migration
                </Button>
              </Link>
              <Link to={createPageUrl('AgentMarketplace')}>
                <Button variant="ghost" className="text-green-300/80 hover:bg-green-500/10 hover:text-green-300">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Marketplace
                </Button>
              </Link>
              <Link to={createPageUrl('AIProjectManager')}>
                <Button variant="ghost" className="text-blue-300/80 hover:bg-blue-500/10 hover:text-blue-300">
                  <Target className="w-4 h-4 mr-2" />
                  AI Projects
                </Button>
              </Link>
              <Link to={createPageUrl('SkillValidation')}>
                <Button variant="ghost" className="text-yellow-300/80 hover:bg-yellow-500/10 hover:text-yellow-300">
                  <Award className="w-4 h-4 mr-2" />
                  Skill Validation
                </Button>
              </Link>
              <Link to={createPageUrl('AIProjectHub')}>
                <Button variant="ghost" className="text-cyan-300/80 hover:bg-cyan-500/10 hover:text-cyan-300">
                  <Target className="w-4 h-4 mr-2" />
                  Project Hub
                </Button>
              </Link>
              <Link to={createPageUrl('ProjectAnalytics')}>
                <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Analytics
                </Button>
              </Link>
              <Link to={createPageUrl('SkillEndorsements')}>
                <Button variant="ghost" className="text-amber-300/80 hover:bg-amber-500/10 hover:text-amber-300">
                  <Award className="w-4 h-4 mr-2" />
                  Endorsements
                </Button>
              </Link>
              <Link to={createPageUrl('ProjectTemplates')}>
                <Button variant="ghost" className="text-cyan-300/80 hover:bg-cyan-500/10 hover:text-cyan-300">
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Button>
              </Link>
              <Link to={createPageUrl('CollaborationHub')}>
                <Button variant="ghost" className="text-pink-300/80 hover:bg-pink-500/10 hover:text-pink-300">
                  <Users className="w-4 h-4 mr-2" />
                  Collaboration
                </Button>
              </Link>
              <Link to={createPageUrl('KnowledgeSynthesis')}>
                <Button variant="ghost" className="text-indigo-300/80 hover:bg-indigo-500/10 hover:text-indigo-300">
                  <Brain className="w-4 h-4 mr-2" />
                  AI Synthesis
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-purple-300/80">Total Volume</CardTitle>
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Wallet className="w-4 h-4 text-purple-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">
                {stats.total.toFixed(2)} <span className="text-lg text-purple-300/60">XRP</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-green-300/80">Completed</CardTitle>
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <ArrowDownRight className="w-4 h-4 text-green-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.completed}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/[0.07] transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-yellow-300/80">Pending</CardTitle>
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Activity className="w-4 h-4 text-yellow-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-light text-white">{stats.pending}</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-light text-white">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionList transactions={transactions} isLoading={isLoading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}