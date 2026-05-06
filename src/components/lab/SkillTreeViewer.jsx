import React, { useState } from 'react';
import { Zap, ChevronDown, ChevronRight, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const CATEGORY_COLORS = {
  governance: 'text-blue-300',
  creative: 'text-pink-300',
  research: 'text-cyan-300',
  leadership: 'text-amber-300',
  technical: 'text-orange-300',
  wisdom: 'text-violet-300',
  combat: 'text-red-300',
  resource_management: 'text-emerald-300',
  diplomacy: 'text-teal-300',
  wellbeing: 'text-rose-300',
};

export default function SkillTreeViewer({ skills, agents }) {
  const [expandedAgent, setExpandedAgent] = useState(null);

  // Group skills by agent_id
  const agentMap = {};
  for (const skill of skills) {
    const aid = skill.agent_id;
    if (!agentMap[aid]) agentMap[aid] = [];
    agentMap[aid].push(skill);
  }

  // Match agent names
  const agentGroups = Object.entries(agentMap).map(([agentId, agentSkills]) => {
    const agent = agents.find(a => a.id === agentId);
    return {
      agentId,
      name: agent?.name || agentId.slice(-8),
      role: agent?.role || 'citizen',
      skills: agentSkills.sort((a, b) => (b.level || 0) - (a.level || 0)),
    };
  }).sort((a, b) => b.skills.length - a.skills.length);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/60 p-5">
      <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
        <Zap className="w-5 h-5 text-cyan-400" /> Skill Tree Viewer
        <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/20 text-[10px] ml-auto">
          {skills.length} skills
        </Badge>
      </h2>

      {agentGroups.length === 0 ? (
        <p className="text-slate-500 text-sm">No skills found.</p>
      ) : (
        <div className="space-y-1">
          {agentGroups.map(group => {
            const isExpanded = expandedAgent === group.agentId;
            return (
              <div key={group.agentId}>
                <button
                  onClick={() => setExpandedAgent(isExpanded ? null : group.agentId)}
                  className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                  <span className="text-white text-xs font-medium flex-1">{group.name}</span>
                  <span className="text-slate-500 text-[10px]">{group.skills.length} skills</span>
                </button>
                {isExpanded && (
                  <div className="ml-6 space-y-2 pb-2">
                    {group.skills.map(skill => (
                      <SkillLeaf key={skill.id} skill={skill} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SkillLeaf({ skill }) {
  const levelPct = ((skill.level || 1) / (skill.max_level || 10)) * 100;
  const categoryColor = CATEGORY_COLORS[skill.skill_category] || 'text-slate-300';

  return (
    <div className="rounded-lg bg-white/[0.03] border border-white/5 p-2.5">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {skill.is_signature_skill && <Star className="w-3 h-3 text-amber-400" />}
            <span className="text-white text-xs font-medium">{skill.skill_name}</span>
          </div>
          <span className={`text-[10px] ${categoryColor}`}>{skill.skill_category}</span>
        </div>
        <Badge className="bg-white/10 text-white border-white/10 text-[10px] font-mono">
          Lv {skill.level || 1}/{skill.max_level || 10}
        </Badge>
      </div>
      <Progress value={levelPct} className="h-1.5" />
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-slate-500">Prof: {skill.proficiency_score || 0}%</span>
        <span className="text-[9px] text-slate-500">{skill.skill_growth_trajectory || 'stable'}</span>
      </div>
    </div>
  );
}