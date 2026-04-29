import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Zap, RefreshCw, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

const TRAJECTORY_CONFIG = {
  accelerating: { icon: TrendingUp, color: 'text-green-400', label: 'Accelerating', badge: 'bg-green-500/20 text-green-300' },
  growing:      { icon: TrendingUp, color: 'text-blue-400',  label: 'Growing',      badge: 'bg-blue-500/20 text-blue-300' },
  stable:       { icon: Minus,      color: 'text-white/40',  label: 'Stable',       badge: 'bg-white/10 text-white/50' },
  declining:    { icon: TrendingDown,color: 'text-red-400',  label: 'Declining',    badge: 'bg-red-500/20 text-red-300' }
};

const CATEGORY_COLORS = {
  governance:          'bg-purple-500/20 text-purple-300',
  resource_management: 'bg-amber-500/20 text-amber-300',
  diplomacy:           'bg-blue-500/20 text-blue-300',
  technical:           'bg-cyan-500/20 text-cyan-300',
  wisdom:              'bg-indigo-500/20 text-indigo-300',
  combat:              'bg-red-500/20 text-red-300',
  creative:            'bg-pink-500/20 text-pink-300',
  research:            'bg-teal-500/20 text-teal-300',
  leadership:          'bg-orange-500/20 text-orange-300',
  wellbeing:           'bg-green-500/20 text-green-300'
};

function SkillRow({ skill, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const traj = TRAJECTORY_CONFIG[skill.skill_growth_trajectory] || TRAJECTORY_CONFIG.stable;
  const Icon = traj.icon;
  const proficiency = skill.proficiency_score > 0 ? skill.proficiency_score : Math.round((skill.level / (skill.max_level || 10)) * 100);

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
      <button
        className="w-full text-left px-3 py-2.5 flex items-center gap-3"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm text-white font-medium truncate">{skill.skill_name}</span>
            {skill.is_signature_skill && (
              <Badge className="text-xs bg-amber-500/20 text-amber-300 shrink-0">★ Signature</Badge>
            )}
          </div>
          <Progress value={proficiency} className="h-1.5" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-white/50">Lv {skill.level}</span>
          <Icon className={`w-3.5 h-3.5 ${traj.color}`} />
          {expanded ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
        </div>
      </button>

      {expanded && (
        <div className="px-3 pb-3 border-t border-white/10 pt-2 space-y-2">
          <div className="flex flex-wrap gap-2">
            {skill.skill_category && (
              <Badge className={`text-xs ${CATEGORY_COLORS[skill.skill_category] || 'bg-white/10 text-white/50'}`}>
                {skill.skill_category.replace(/_/g, ' ')}
              </Badge>
            )}
            <Badge className={`text-xs ${traj.badge}`}>{traj.label}</Badge>
            <Badge className="text-xs bg-white/5 text-white/50">{proficiency}% proficiency</Badge>
          </div>
          {skill.skill_description && (
            <p className="text-xs text-white/50 italic">{skill.skill_description}</p>
          )}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded bg-black/20 p-1.5">
              <div className="text-xs text-white/40">Used</div>
              <div className="text-sm text-white">{skill.times_used || 0}×</div>
            </div>
            <div className="rounded bg-black/20 p-1.5">
              <div className="text-xs text-white/40">Success</div>
              <div className="text-sm text-white">{skill.success_rate || 100}%</div>
            </div>
            <div className="rounded bg-black/20 p-1.5">
              <div className="text-xs text-white/40">XP</div>
              <div className="text-sm text-white">{skill.experience_invested || 0}</div>
            </div>
          </div>
          {onDelete && (
            <div className="pt-2 border-t border-white/10">
              {!confirmDelete ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 text-xs w-full"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="w-3 h-3 mr-1" /> Remove Skill
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 text-xs flex-1"
                    onClick={() => onDelete(skill.id)}
                  >
                    Confirm Delete
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white/40 text-xs"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SkillProfilePanel({ agentId, skills, onRefresh }) {
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleDelete = async (skillId) => {
    await base44.entities.AgentSkill.delete(skillId);
    toast.success('Skill removed');
    onRefresh?.();
  };

  const syncProfile = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('updateAgentSkillProfile', { agent_id: agentId });
      const data = res.data;
      if (data?.success) {
        setLastResult(data);
        if (data.skills_updated > 0) {
          toast.success(`${data.skills_updated} skill(s) updated from feedback & goal data`);
          onRefresh?.();
        } else {
          toast.info('Skills are already up to date');
        }
      } else {
        toast.error(data?.error || 'Sync failed');
      }
    } catch (e) {
      toast.error('Sync error: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  // Group by category
  const grouped = skills.reduce((acc, s) => {
    const cat = s.skill_category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  const computeProficiency = (sk) => {
    if (sk.proficiency_score > 0) return sk.proficiency_score;
    return Math.round((sk.level / (sk.max_level || 10)) * 100);
  };

  const totalProficiency = skills.length
    ? Math.round(skills.reduce((s, sk) => s + computeProficiency(sk), 0) / skills.length)
    : 0;

  const trajectoryCount = skills.reduce((acc, s) => {
    const t = s.skill_growth_trajectory || 'stable';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  return (
    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Skill Profile ({skills.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={syncProfile}
            disabled={syncing}
            className="border-white/10 text-white/70 hover:text-white text-xs"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing…' : 'Sync Profile'}
          </Button>
        </div>

        {/* Summary bar */}
        {skills.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div className="rounded-lg bg-white/5 p-2 text-center">
              <div className="text-xs text-white/40">Avg Proficiency</div>
              <div className="text-lg font-light text-white">{totalProficiency}%</div>
            </div>
            <div className="rounded-lg bg-green-500/10 p-2 text-center">
              <div className="text-xs text-green-400/60">Growing</div>
              <div className="text-lg font-light text-green-300">{(trajectoryCount.growing || 0) + (trajectoryCount.accelerating || 0)}</div>
            </div>
            <div className="rounded-lg bg-white/5 p-2 text-center">
              <div className="text-xs text-white/40">Stable</div>
              <div className="text-lg font-light text-white">{trajectoryCount.stable || 0}</div>
            </div>
            <div className="rounded-lg bg-red-500/10 p-2 text-center">
              <div className="text-xs text-red-400/60">Declining</div>
              <div className="text-lg font-light text-red-300">{trajectoryCount.declining || 0}</div>
            </div>
          </div>
        )}

        {lastResult && lastResult.skills_updated > 0 && (
          <div className="mt-2 text-xs text-green-400/80 bg-green-500/10 rounded px-2 py-1">
            Last sync: {lastResult.skills_updated} skill(s) updated — {new Date(lastResult.synced_at).toLocaleTimeString()}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {skills.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">No skills yet</p>
        ) : (
          Object.entries(grouped).map(([cat, catSkills]) => (
            <div key={cat}>
              <div className="text-xs text-white/30 uppercase tracking-wider mb-2 capitalize">
                {cat.replace(/_/g, ' ')}
              </div>
              <div className="space-y-1.5">
                {catSkills
                  .sort((a, b) => (b.proficiency_score || 0) - (a.proficiency_score || 0))
                  .map(skill => (
                    <SkillRow key={skill.id} skill={skill} onDelete={handleDelete} />
                  ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}