import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Unlock, TrendingUp, CheckCircle } from 'lucide-react';

const SKILL_TREE_STRUCTURE = {
  governance: [
    { id: 'governance_basics', name: 'Governance Basics', cost: 50, prereqs: [], position: { x: 0, y: 0 } },
    { id: 'proposal_crafting', name: 'Proposal Crafting', cost: 100, prereqs: ['governance_basics'], position: { x: 1, y: 0 } },
    { id: 'diplomatic_influence', name: 'Diplomatic Influence', cost: 150, prereqs: ['proposal_crafting'], position: { x: 2, y: 0 } }
  ],
  resource_management: [
    { id: 'resource_gathering', name: 'Resource Gathering', cost: 50, prereqs: [], position: { x: 0, y: 0 } },
    { id: 'advanced_trading', name: 'Advanced Trading', cost: 100, prereqs: ['resource_gathering'], position: { x: 1, y: 0 } },
    { id: 'economic_strategy', name: 'Economic Strategy', cost: 150, prereqs: ['advanced_trading'], position: { x: 2, y: 0 } }
  ],
  diplomacy: [
    { id: 'empathy', name: 'Empathy', cost: 50, prereqs: [], position: { x: 0, y: 0 } },
    { id: 'conflict_resolution', name: 'Conflict Resolution', cost: 100, prereqs: ['empathy'], position: { x: 1, y: 0 } },
    { id: 'alliance_building', name: 'Alliance Building', cost: 150, prereqs: ['conflict_resolution'], position: { x: 2, y: 0 } }
  ],
  technical: [
    { id: 'technical_basics', name: 'Technical Basics', cost: 50, prereqs: [], position: { x: 0, y: 0 } },
    { id: 'innovation', name: 'Innovation', cost: 100, prereqs: ['technical_basics'], position: { x: 1, y: 0 } },
    { id: 'mastery', name: 'Technical Mastery', cost: 150, prereqs: ['innovation'], position: { x: 2, y: 0 } }
  ],
  wisdom: [
    { id: 'observation', name: 'Observation', cost: 50, prereqs: [], position: { x: 0, y: 0 } },
    { id: 'meditation', name: 'Meditation', cost: 100, prereqs: ['observation'], position: { x: 1, y: 0 } },
    { id: 'enlightenment', name: 'Enlightenment', cost: 150, prereqs: ['meditation'], position: { x: 2, y: 0 } }
  ],
  combat: [
    { id: 'defense', name: 'Defense', cost: 50, prereqs: [], position: { x: 0, y: 0 } },
    { id: 'tactical_thinking', name: 'Tactical Thinking', cost: 100, prereqs: ['defense'], position: { x: 1, y: 0 } },
    { id: 'guardian', name: 'Guardian', cost: 150, prereqs: ['tactical_thinking'], position: { x: 2, y: 0 } }
  ]
};

const CATEGORY_COLORS = {
  governance: 'from-purple-500 to-indigo-600',
  resource_management: 'from-emerald-500 to-green-600',
  diplomacy: 'from-pink-500 to-rose-600',
  technical: 'from-blue-500 to-cyan-600',
  wisdom: 'from-amber-500 to-yellow-600',
  combat: 'from-red-500 to-orange-600'
};

export default function SkillTreeVisualizer({ category, agentSkills, agentExperience, onUnlock, onUpgrade, isLoading }) {
  const skills = SKILL_TREE_STRUCTURE[category] || [];
  const unlockedSkillIds = agentSkills.map(s => s.skill_id);

  const getSkillStatus = (skillDef) => {
    const agentSkill = agentSkills.find(s => s.skill_id === skillDef.id);
    if (agentSkill) return { unlocked: true, level: agentSkill.level, skill: agentSkill };

    const prereqsMet = skillDef.prereqs.every(prereq => unlockedSkillIds.includes(prereq));
    const canAfford = agentExperience >= skillDef.cost;
    
    return { unlocked: false, canUnlock: prereqsMet && canAfford, prereqsMet };
  };

  return (
    <div className="space-y-4">
      {skills.map((skillDef, index) => {
        const status = getSkillStatus(skillDef);
        const isLast = index === skills.length - 1;

        return (
          <div key={skillDef.id} className="relative">
            {/* Connection line to next skill */}
            {!isLast && (
              <div className="absolute left-1/2 top-full h-6 w-0.5 bg-white/20 transform -translate-x-1/2" />
            )}

            <Card className={`bg-white/5 backdrop-blur-xl border-white/10 ${
              status.unlocked ? 'border-green-500/30' : status.canUnlock ? 'border-yellow-500/30' : ''
            }`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${CATEGORY_COLORS[category]} flex items-center justify-center relative`}>
                      {status.unlocked ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-white" />
                          <Badge className="absolute -top-2 -right-2 w-6 h-6 p-0 flex items-center justify-center bg-white text-black">
                            {status.level}
                          </Badge>
                        </>
                      ) : status.canUnlock ? (
                        <Unlock className="w-6 h-6 text-white" />
                      ) : (
                        <Lock className="w-6 h-6 text-white/50" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{skillDef.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Cost: {status.unlocked ? skillDef.cost * status.level : skillDef.cost} XP
                        </Badge>
                        {status.unlocked && status.level < 5 && (
                          <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Level {status.level}/5
                          </Badge>
                        )}
                        {status.unlocked && status.level === 5 && (
                          <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            Mastered
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!status.unlocked && status.canUnlock && (
                      <Button 
                        size="sm"
                        onClick={() => onUnlock(skillDef.id)}
                        disabled={isLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Unlock
                      </Button>
                    )}
                    {!status.unlocked && !status.canUnlock && (
                      <Button 
                        size="sm"
                        disabled
                        variant="ghost"
                        className="text-white/40"
                      >
                        {!status.prereqsMet ? 'Locked' : 'Need XP'}
                      </Button>
                    )}
                    {status.unlocked && status.level < 5 && (
                      <Button 
                        size="sm"
                        onClick={() => onUpgrade(skillDef.id)}
                        disabled={isLoading || agentExperience < skillDef.cost * status.level}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <TrendingUp className="w-3 h-3 mr-1" />
                        Upgrade
                      </Button>
                    )}
                  </div>
                </div>

                {!status.prereqsMet && skillDef.prereqs.length > 0 && (
                  <p className="text-xs text-white/60 mt-2">
                    Requires: {skillDef.prereqs.map(p => SKILL_TREE_STRUCTURE[category].find(s => s.id === p)?.name).join(', ')}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}