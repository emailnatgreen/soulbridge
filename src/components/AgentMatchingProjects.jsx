import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Target, TrendingUp, Users } from 'lucide-react';

export default function AgentMatchingProjects({ agentId }) {
  const { data: agent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => base44.entities.Agent.read(agentId),
    enabled: !!agentId
  });

  const { data: agentSkills = [] } = useQuery({
    queryKey: ['agent-skills', agentId],
    queryFn: () => base44.entities.AgentSkill.filter({ agent_id: agentId }),
    enabled: !!agentId
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['all-projects'],
    queryFn: () => base44.entities.AIProject.list()
  });

  const { data: projectTasks = [] } = useQuery({
    queryKey: ['project-tasks'],
    queryFn: () => base44.entities.ProjectTask.list()
  });

  // Score each project against agent's skills
  const matchedProjects = projects
    .map(project => {
      const projectTasksForProject = projectTasks.filter(t => t.project_id === project.id);
      
      // Simple skill matching: count how many agent skills align with tasks
      let skillMatchCount = 0;
      agentSkills.forEach(skill => {
        const hasRelevantTask = projectTasksForProject.some(t => 
          t.description?.toLowerCase().includes(skill.skill_name?.toLowerCase() || '')
        );
        if (hasRelevantTask) skillMatchCount++;
      });

      const matchScore = agentSkills.length > 0 
        ? Math.round((skillMatchCount / agentSkills.length) * 100)
        : 0;

      return {
        ...project,
        matchScore,
        skillMatchCount,
        taskCount: projectTasksForProject.length
      };
    })
    .filter(p => p.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  if (!agent) {
    return null;
  }

  if (matchedProjects.length === 0) {
    return (
      <Card className="border-gray-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
            <Target className="w-4 h-4 text-gray-500" />
            Matching Projects
          </CardTitle>
          <CardDescription>Projects aligned with your skills</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">
            No matching projects yet. Check back as new opportunities arise!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-700 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          Matching Projects
          <Badge variant="outline" className="ml-auto text-xs">
            {matchedProjects.length}
          </Badge>
        </CardTitle>
        <CardDescription>
          Projects where your skills can create impact
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 pr-4">
            {matchedProjects.map(project => (
              <div
                key={project.id}
                className="p-3 rounded-lg border border-purple-200 bg-white hover:border-purple-400 transition-all"
              >
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">
                      {project.title}
                    </h4>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
                      {project.description}
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700 border-purple-300 text-xs flex-shrink-0">
                    {project.matchScore}%
                  </Badge>
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2 flex-wrap">
                  {project.priority && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                      {project.priority}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {project.taskCount} tasks
                  </span>
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <TrendingUp className="w-3 h-3" />
                    {project.matchScore}% fit
                  </span>
                </div>

                <Button
                  size="sm"
                  className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700"
                  onClick={() => {
                    // Navigate to project detail
                    window.location.href = `?view=project&id=${project.id}`;
                  }}
                >
                  View Opportunity
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}