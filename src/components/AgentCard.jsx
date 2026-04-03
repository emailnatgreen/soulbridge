import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Wallet, Activity, Edit, Eye, MessageCircle, BarChart2, Heart, TrendingUp } from 'lucide-react';
import AgentChatModal from './AgentChatModal';
import AgentInsightsPanel from './AgentInsightsPanel';

export default function AgentCard({ agent, wallets, socialCapitalMap = {}, reputationMap = {}, economicMap = {} }) {
  const [showChat, setShowChat] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const wallet = wallets.find(w => w.id === agent.wallet_id);
  const socialCapital = socialCapitalMap[agent.id];
  const reputationScore = reputationMap[agent.id] || 0;
  const economicActivity = economicMap[agent.id] || [];
  
  const statusConfig = {
    active: { color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: Sparkles },
    dormant: { color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20', icon: Activity },
    suspended: { color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: Activity }
  };

  const config = statusConfig[agent.status] || statusConfig.active;
  const StatusIcon = config.icon;

  const getHonorColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <>
    <Card className="bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 transition-all duration-300 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link to={`/AgentDetails?id=${agent.id}`} className="flex items-start gap-3 flex-1">
            <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
              {agent.avatar_url ? (
                <img src={agent.avatar_url} alt={agent.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-lg">
                  {agent.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-medium text-lg truncate">{agent.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${config.color} border text-xs`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {agent.status}
                </Badge>
              </div>
            </div>
          </div>
          </Link>
          <Link to={`/EditAgent?id=${agent.id}`} onClick={(e) => e.stopPropagation()}>
            <Button size="icon" variant="ghost" className="text-white/40 hover:text-white/80 hover:bg-white/5 h-8 w-8">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Purpose */}
        <div>
          <p className="text-xs text-white/40 mb-1">Purpose</p>
          <p className="text-sm text-white/80 line-clamp-2">{agent.purpose}</p>
          {agent.tagline && (
            <p className="text-xs text-purple-300/70 italic mt-2">"{agent.tagline}"</p>
          )}
        </div>

        {/* Honor Score */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/40">Honor</span>
          <span className={`text-2xl font-light ${getHonorColor(agent.honor_score || 100)}`}>
            {agent.honor_score || 100}
          </span>
        </div>

        {/* DID / Wallet Address */}
        {(agent.classic_address || wallet?.classic_address) && (
          <div>
            <p className="text-xs text-white/40 mb-1">DID / Wallet</p>
            <div className="flex items-center gap-2">
              <Wallet className="w-3 h-3 text-purple-400" />
              <code className="text-xs text-purple-300/60 truncate">
                {(agent.classic_address || wallet?.classic_address).slice(0, 12)}...{(agent.classic_address || wallet?.classic_address).slice(-6)}
              </code>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="pt-3 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">Transactions</span>
            <span className="text-white/60">{agent.total_transactions || 0}</span>
          </div>
          {socialCapital && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40 flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />Social Capital</span>
              <span className="text-pink-300 font-medium">{socialCapital.total_score || 0}</span>
            </div>
          )}
          {reputationScore !== 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40 flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-400" />Reputation</span>
              <span className={`font-medium ${reputationScore >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>{reputationScore >= 0 ? '+' : ''}{reputationScore}</span>
            </div>
          )}
          {economicActivity.length > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40 flex items-center gap-1"><Activity className="w-3 h-3 text-blue-400" />Recent Activity</span>
              <span className="text-blue-300">{economicActivity.length} events</span>
            </div>
          )}
        </div>

        {agent.parent_agent_id && (
          <div className="text-xs text-white/30 italic">
            Born from another agent
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-white/5 flex gap-2">
          <Link to={`/AgentProfile?id=${agent.id}`} className="flex-1">
            <Button size="sm" variant="ghost" className="w-full text-purple-300 hover:bg-purple-500/10">
              <Eye className="w-3 h-3 mr-2" />
              Profile
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => setShowChat(true)}
            className="flex-1 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/30 text-purple-300 hover:from-purple-600/50 hover:to-pink-600/50"
          >
            <MessageCircle className="w-3 h-3 mr-2" />
            Chat
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowInsights(p => !p)}
            className={`text-blue-300 hover:bg-blue-500/10 ${showInsights ? 'bg-blue-500/10' : ''}`}
            title="Agent Insights"
          >
            <BarChart2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Insights Panel */}
        {showInsights && <AgentInsightsPanel agent={agent} />}
      </CardContent>
    </Card>

    {showChat && (
      <AgentChatModal agent={agent} onClose={() => setShowChat(false)} />
    )}
    </>
  );
}