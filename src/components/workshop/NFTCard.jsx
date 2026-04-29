import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Chrome, Bot, Sparkles, Shield, ExternalLink, Trash2,
  FileJson, Zap, Globe, CreditCard, Clock
} from 'lucide-react';
import MintActionButton from './MintActionButton';

const STATUS_COLORS = {
  draft: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  prepared: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  simulated: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  minted_mainnet: 'bg-green-500/20 text-green-300 border-green-500/30',
  failed: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const TYPE_CONFIG = {
  chrome_skill: { icon: Chrome, color: 'text-emerald-400', bg: 'from-emerald-600/10 to-teal-600/5 border-emerald-500/20', label: 'Chrome Skill' },
  agent: { icon: Bot, color: 'text-amber-400', bg: 'from-amber-600/10 to-orange-600/5 border-amber-500/20', label: 'AI Agent' },
  infrastructure: { icon: Shield, color: 'text-red-400', bg: 'from-red-600/10 to-orange-600/5 border-red-500/20', label: 'Infrastructure' },
  widget: { icon: Sparkles, color: 'text-purple-400', bg: 'from-purple-600/10 to-pink-600/5 border-purple-500/20', label: 'Widget' },
};

function getType(w) {
  if (w.chrome_skill_instructions?.length) return 'chrome_skill';
  if (w.category === 'agent_creation') return 'agent';
  if (w.immutable_after_mint?.length > 5) return 'infrastructure';
  return 'widget';
}

function parseCustomData(w) {
  if (!w.governance_notes) return null;
  try {
    const raw = w.governance_notes.includes('---')
      ? w.governance_notes.split('---').pop().trim()
      : w.governance_notes;
    const parsed = JSON.parse(raw);
    return parsed.custom_data || parsed;
  } catch { return null; }
}

const DELETABLE = ['draft', 'prepared', 'simulated', 'failed'];

export default function NFTCard({ widget, onDelete, deleting }) {
  const type = getType(widget);
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  const customData = parseCustomData(widget);
  const skillCount = widget.chrome_skill_instructions?.length || 0;
  const hasManifest = !!widget.webmcp_manifest;
  const isMinted = widget.mint_status === 'minted_mainnet';
  const streamCost = widget.cost_per_stream_interval || 0;

  return (
    <Card className={`bg-gradient-to-br ${config.bg} border overflow-hidden hover:border-white/20 transition-all group`}>
      <CardContent className="p-0">
        <Link to={`/widget-marketplace/${widget.id}`} className="block">
          {/* Header */}
          <div className="flex items-start gap-3 p-3 pb-2">
            {widget.image_url ? (
              <img src={widget.image_url} alt={widget.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10" />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-white text-xs font-semibold truncate">{widget.name}</p>
                <Badge className={`text-[8px] flex-shrink-0 ${STATUS_COLORS[widget.mint_status] || STATUS_COLORS.draft}`}>
                  {widget.mint_status?.replace(/_/g, ' ') || 'draft'}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <Badge variant="outline" className={`text-[8px] ${config.color} border-current/20`}>
                  <Icon className="w-2.5 h-2.5 mr-0.5" />{config.label}
                </Badge>
                {widget.nft_id && (
                  <span className="text-white/20 text-[8px] font-mono">{widget.nft_id}</span>
                )}
              </div>
              {widget.description && (
                <p className="text-white/30 text-[9px] mt-1 line-clamp-2 leading-relaxed">{widget.description}</p>
              )}
            </div>
          </div>

          {/* Chrome Skill specifics */}
          {type === 'chrome_skill' && skillCount > 0 && (
            <div className="px-3 pb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-300 gap-1">
                  <Zap className="w-2.5 h-2.5" /> {skillCount} skill{skillCount !== 1 ? 's' : ''}
                </Badge>
                {hasManifest && (
                  <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-300 gap-1">
                    <FileJson className="w-2.5 h-2.5" /> WebMCP
                  </Badge>
                )}
                {widget.chrome_skill_instructions?.some(s => s.requires_didit_verification) && (
                  <Badge variant="outline" className="text-[8px] border-purple-500/30 text-purple-300 gap-1">
                    <Shield className="w-2.5 h-2.5" /> DIDit
                  </Badge>
                )}
                {widget.chrome_skill_instructions?.some(s => s.multi_tab) && (
                  <Badge variant="outline" className="text-[8px] border-blue-500/30 text-blue-300 gap-1">
                    <Globe className="w-2.5 h-2.5" /> Multi-tab
                  </Badge>
                )}
              </div>
              {/* Skill triggers with emojis */}
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                {widget.chrome_skill_instructions.slice(0, 3).map((s, i) => (
                  <span key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 text-[8px] text-emerald-300 font-mono flex items-center gap-0.5">
                    {s.emoji && <span className="text-[9px]">{s.emoji}</span>}
                    {s.trigger_command || s.skill_name}
                  </span>
                ))}
                {skillCount > 3 && (
                  <span className="text-white/20 text-[8px]">+{skillCount - 3} more</span>
                )}
              </div>
              {/* Category badges */}
              {widget.chrome_skill_instructions.some(s => s.skill_category) && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {[...new Set(widget.chrome_skill_instructions.map(s => s.skill_category).filter(Boolean))].map(cat => (
                    <span key={cat} className="bg-indigo-500/10 border border-indigo-500/20 rounded px-1.5 py-0.5 text-[7px] text-indigo-300 capitalize">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Economics row */}
          {(streamCost > 0 || customData?.nft_cost_rlusd > 0) && (
            <div className="px-3 pb-2 flex items-center gap-3 text-[9px]">
              {customData?.nft_cost_rlusd > 0 && (
                <span className="flex items-center gap-1 text-amber-300/60">
                  <CreditCard className="w-2.5 h-2.5" /> {customData.nft_cost_rlusd} RLUSD
                </span>
              )}
              {streamCost > 0 && (
                <span className="flex items-center gap-1 text-green-300/60">
                  <Clock className="w-2.5 h-2.5" /> {streamCost}/{widget.stream_interval_unit || 'day'}
                </span>
              )}
            </div>
          )}
        </Link>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-1.5">
            {widget.category === 'agent_creation' && (
              <Link
                to="/my-agents"
                onClick={e => e.stopPropagation()}
                className="text-[9px] text-amber-300 hover:text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-0.5 transition-colors flex items-center gap-0.5"
              >
                <Bot className="w-2.5 h-2.5" />Agent Hub
              </Link>
            )}
            {widget.xrpl_tx_hash && (
              <a
                href={`https://xrpscan.com/tx/${widget.xrpl_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[9px] text-cyan-300 hover:text-cyan-200 bg-cyan-500/10 border border-cyan-500/30 rounded px-1.5 py-0.5 transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" /> XRPScan
              </a>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <MintActionButton widget={widget} />
            {DELETABLE.includes(widget.mint_status || 'draft') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-400/60 hover:text-red-300 hover:bg-red-500/20"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete?.(e, widget); }}
                disabled={deleting === widget.id}
              >
                <Trash2 className={`w-3.5 h-3.5 ${deleting === widget.id ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}