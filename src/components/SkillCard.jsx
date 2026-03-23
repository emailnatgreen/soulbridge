import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Check } from 'lucide-react';

export default function SkillCard({ skill }) {
  const levelColors = {
    novice: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    journeyman: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    expert: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    master: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  };

  return (
    <Card className="bg-white/5 border-white/10 hover:border-blue-500/30 transition-all cursor-pointer">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-white text-lg mb-2">{skill.name}</CardTitle>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
              {skill.category.replace(/_/g, ' ')}
            </Badge>
          </div>
          <Lightbulb className="w-5 h-5 text-blue-400 flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-white/60 text-sm line-clamp-2">{skill.description}</p>
        
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <Badge className={`${levelColors[skill.level]} text-xs`}>
            {skill.level.charAt(0).toUpperCase() + skill.level.slice(1)}
          </Badge>
          {skill.verifiable && (
            <div className="flex items-center gap-1 text-green-400 text-sm">
              <Check className="w-4 h-4" />
              Verifiable
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}