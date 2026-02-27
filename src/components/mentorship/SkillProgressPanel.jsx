import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';

export default function SkillProgressPanel({ relationships }) {
  // Collect all skill proficiency gains across all relationships
  const skillMap = {};
  relationships.forEach(rel => {
    (rel.skill_proficiency_gains || []).forEach(gain => {
      const name = gain.skill_name || gain.skill_id;
      if (!name) return;
      if (!skillMap[name]) skillMap[name] = { gains: [], targets: [] };
      skillMap[name].gains.push((gain.current_proficiency || 0) - (gain.starting_proficiency || 0));
      skillMap[name].targets.push(gain.target_proficiency || 100);
    });
  });

  const skills = Object.entries(skillMap).map(([name, d]) => ({
    name,
    avgGain: +(d.gains.reduce((a, b) => a + b, 0) / d.gains.length).toFixed(1),
    avgTarget: +(d.targets.reduce((a, b) => a + b, 0) / d.targets.length).toFixed(0)
  })).sort((a, b) => b.avgGain - a.avgGain).slice(0, 8);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-400" />
          Top Skill Gains Across Mentorships
        </CardTitle>
      </CardHeader>
      <CardContent>
        {skills.length === 0 ? (
          <p className="text-white/40 text-sm text-center py-6">No skill progress recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {skills.map(skill => (
              <div key={skill.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{skill.name}</span>
                  <span className="text-green-400">+{skill.avgGain} avg gain</span>
                </div>
                <Progress value={Math.min(100, skill.avgGain)} className="h-1.5" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}