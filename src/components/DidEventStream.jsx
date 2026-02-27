import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import {
  Radio, FileJson, Shield, Trash2, RotateCcw, Eye,
  Link2, UserPlus, CheckCircle, AlertTriangle, Pause, Play
} from 'lucide-react';

const EVENT_CONFIG = {
  did_created:          { label: 'DID Created',         color: 'text-green-400',  bg: 'bg-green-900/20 border-green-500/20',  icon: CheckCircle },
  did_revoked:          { label: 'DID Revoked',          color: 'text-red-400',    bg: 'bg-red-900/20 border-red-500/20',      icon: Trash2 },
  did_reversal:         { label: 'Revocation Reversed',  color: 'text-amber-400',  bg: 'bg-amber-900/20 border-amber-500/20',  icon: RotateCcw },
  version_created:      { label: 'Version Created',      color: 'text-indigo-400', bg: 'bg-indigo-900/20 border-indigo-500/20',icon: FileJson },
  version_activated:    { label: 'Version Activated',    color: 'text-cyan-400',   bg: 'bg-cyan-900/20 border-cyan-500/20',    icon: CheckCircle },
  did_verified:         { label: 'DID Verified',         color: 'text-blue-400',   bg: 'bg-blue-900/20 border-blue-500/20',    icon: Shield },
  did_document_viewed:  { label: 'Document Viewed',      color: 'text-white/50',   bg: 'bg-slate-800/40 border-white/10',      icon: Eye },
  permission_granted:   { label: 'Permission Granted',   color: 'text-purple-400', bg: 'bg-purple-900/20 border-purple-500/20',icon: Link2 },
  permission_revoked:   { label: 'Permission Revoked',   color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-500/20',icon: AlertTriangle },
  agent_linked:         { label: 'Agent Linked',         color: 'text-teal-400',   bg: 'bg-teal-900/20 border-teal-500/20',    icon: UserPlus },
  agent_unlinked:       { label: 'Agent Unlinked',       color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/20',icon: AlertTriangle },
};

function EventRow({ event, isNew }) {
  const cfg = EVENT_CONFIG[event.action_type] || {
    label: event.action_type,
    color: 'text-white/60',
    bg: 'bg-slate-800/30 border-white/5',
    icon: Radio,
  };
  const Icon = cfg.icon;

  return (
    <div className={`flex items-start gap-3 border rounded-lg px-4 py-3 text-xs transition-all duration-500 ${cfg.bg} ${isNew ? 'ring-1 ring-white/20' : ''}`}>
      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
          {event.did_classic_address && (
            <code className="text-white/30 truncate max-w-[180px]">
              did:xrpl:{event.did_classic_address.slice(0, 8)}…
            </code>
          )}
          {event.user_email && (
            <span className="text-white/30">· {event.user_email}</span>
          )}
        </div>
        {event.action_details && Object.keys(event.action_details).length > 0 && (
          <div className="text-white/30 mt-0.5 truncate">
            {Object.entries(event.action_details).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(' · ')}
          </div>
        )}
      </div>
      <span className="text-white/25 shrink-0 whitespace-nowrap">
        {formatDistanceToNow(new Date(event.created_date), { addSuffix: true })}
      </span>
    </div>
  );
}

export default function DidEventStream() {
  const [events, setEvents] = useState([]);
  const [newIds, setNewIds] = useState(new Set());
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const seenRef = useRef(new Set());

  // Initial load
  useEffect(() => {
    base44.entities.DidAuditLog.list('-created_date', 30).then(logs => {
      setEvents(logs);
      logs.forEach(l => seenRef.current.add(l.id));
    });
  }, []);

  // Real-time subscription
  useEffect(() => {
    const unsub = base44.entities.DidAuditLog.subscribe((event) => {
      if (pausedRef.current) return;
      if (event.type === 'create' && event.data && !seenRef.current.has(event.id)) {
        seenRef.current.add(event.id);
        setEvents(prev => [event.data, ...prev].slice(0, 50));
        setNewIds(prev => new Set([...prev, event.id]));
        setTimeout(() => setNewIds(prev => { const n = new Set(prev); n.delete(event.id); return n; }), 3000);
      }
    });
    return unsub;
  }, []);

  const handlePause = () => {
    pausedRef.current = !paused;
    setPaused(p => !p);
  };

  // Count by type for mini-stats
  const typeCounts = events.reduce((acc, e) => {
    acc[e.action_type] = (acc[e.action_type] || 0) + 1;
    return acc;
  }, {});

  const criticalTypes = ['did_revoked', 'permission_revoked', 'agent_unlinked'];
  const criticalCount = criticalTypes.reduce((sum, t) => sum + (typeCounts[t] || 0), 0);

  return (
    <div className="bg-slate-800/40 border border-white/10 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${paused ? 'bg-amber-400' : 'bg-green-400 animate-pulse'}`} />
            <Radio className="w-4 h-4 text-white/60" />
            <span className="font-semibold text-sm text-white/80">DID Event Stream</span>
          </div>
          {criticalCount > 0 && (
            <Badge className="bg-red-600 text-white border-0 text-xs">{criticalCount} critical</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/30">{events.length} events</span>
          <Button size="sm" variant="ghost" onClick={handlePause}
            className="h-7 px-2 text-white/50 hover:text-white text-xs">
            {paused ? <><Play className="w-3 h-3 mr-1" />Resume</> : <><Pause className="w-3 h-3 mr-1" />Pause</>}
          </Button>
        </div>
      </div>

      {/* Mini stats strip */}
      <div className="flex gap-1 px-5 py-2 border-b border-white/5 overflow-x-auto">
        {Object.entries(EVENT_CONFIG).filter(([k]) => typeCounts[k]).map(([k, cfg]) => (
          <span key={k} className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${cfg.bg} ${cfg.color}`}>
            {typeCounts[k]}× {cfg.label}
          </span>
        ))}
        {events.length === 0 && <span className="text-xs text-white/20">No events yet</span>}
      </div>

      {/* Event list */}
      <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-center py-8 text-white/20 text-sm">
            <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
            Listening for DID events…
          </div>
        ) : (
          events.map(event => (
            <EventRow key={event.id} event={event} isNew={newIds.has(event.id)} />
          ))
        )}
      </div>
    </div>
  );
}