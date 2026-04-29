import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Activity, Vote, Users, Zap, BookOpen, Award, Shield, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const EVENT_CONFIG = {
  agent: { icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/20', label: 'Agent' },
  governance: { icon: Vote, color: 'text-purple-400', bg: 'bg-purple-500/20', label: 'Governance' },
  skill: { icon: BookOpen, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Skill' },
  economy: { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Economy' },
  honor: { icon: Award, color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'Honor' },
  identity: { icon: Shield, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Identity' },
};

function categorizeEvent(item) {
  if (item._source === 'agent') return 'agent';
  if (item._source === 'proposal') return 'governance';
  if (item._source === 'skill') return 'skill';
  if (item._source === 'economy') return 'economy';
  if (item._source === 'wallet') return 'identity';
  return 'economy';
}

function formatEvent(item) {
  if (item._source === 'agent') {
    return { text: `${item.name} joined the Village`, detail: item.role || 'citizen', link: `/agents/${item.id}` };
  }
  if (item._source === 'proposal') {
    return { text: `Proposal: ${item.title}`, detail: item.status || 'active', link: '/governance' };
  }
  if (item._source === 'skill') {
    return { text: `Skill acquired: ${item.name || item.skill_name}`, detail: `Level ${item.level || 1}`, link: '/skills' };
  }
  if (item._source === 'economy') {
    return { text: item.description || `${item.activity_type} activity`, detail: item.amount ? `${item.amount} XRP` : '', link: '/Economy' };
  }
  if (item._source === 'wallet') {
    return { text: `DID published: ${(item.classic_address || '').slice(0, 12)}…`, detail: item.network || 'mainnet', link: '/sovereign-id' };
  }
  return { text: 'Village activity', detail: '', link: '/home' };
}

export default function LiveActivityFeed({ compact = false, limit = 8 }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['live-activity-feed', limit],
    queryFn: async () => {
      const [agents, proposals, skills, economy, wallets] = await Promise.all([
        base44.entities.Agent.list('-created_date', 5).catch(() => []),
        base44.entities.GovernanceProposal.list('-created_date', 5).catch(() => []),
        base44.entities.AgentSkill.list('-created_date', 5).catch(() => []),
        base44.entities.EconomicActivity.list('-created_date', 5).catch(() => []),
        base44.entities.Wallet.filter({ is_published: true }, '-created_date', 3).catch(() => []),
      ]);
      
      const all = [
        ...agents.map(a => ({ ...a, _source: 'agent', _time: a.created_date })),
        ...proposals.map(p => ({ ...p, _source: 'proposal', _time: p.created_date })),
        ...skills.map(s => ({ ...s, _source: 'skill', _time: s.created_date })),
        ...economy.map(e => ({ ...e, _source: 'economy', _time: e.created_date })),
        ...wallets.map(w => ({ ...w, _source: 'wallet', _time: w.published_at || w.created_date })),
      ];
      
      return all
        .filter(e => e._time)
        .sort((a, b) => new Date(b._time) - new Date(a._time))
        .slice(0, limit);
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-white/5 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6">
        <Activity className="w-6 h-6 text-white/20 mx-auto mb-2" />
        <p className="text-white/30 text-xs">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {events.map((event, i) => {
        const category = categorizeEvent(event);
        const config = EVENT_CONFIG[category];
        const Icon = config.icon;
        const info = formatEvent(event);
        const timeAgo = event._time ? formatDistanceToNow(new Date(event._time), { addSuffix: true }) : '';

        return (
          <Link
            key={`${event._source}-${event.id}-${i}`}
            to={info.link}
            className="flex items-center gap-2.5 bg-white/5 hover:bg-white/8 rounded-lg p-2 sm:p-2.5 transition-all group"
          >
            <div className={`w-7 h-7 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-3.5 h-3.5 ${config.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[10px] sm:text-xs font-medium truncate group-hover:text-purple-300 transition-colors">
                {info.text}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                {info.detail && <span className={`text-[8px] sm:text-[10px] ${config.color}`}>{info.detail}</span>}
                <span className="text-white/20 text-[7px] sm:text-[9px] flex items-center gap-0.5">
                  <Clock className="w-2.5 h-2.5" />{timeAgo}
                </span>
              </div>
            </div>
            <ArrowRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition flex-shrink-0" />
          </Link>
        );
      })}
    </div>
  );
}