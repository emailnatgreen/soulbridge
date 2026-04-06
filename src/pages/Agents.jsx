import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Agents() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list('-created_date', 100),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-light text-white">The Village</h1>
              <p className="text-sm text-purple-300/60">AI Agents with Soul</p>
            </div>
            <Button 
              onClick={() => setShowCreate(!showCreate)}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-flex items-center justify-center w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin"></div>
            </div>
          ) : agents.length === 0 ? (
            <Card className="col-span-full bg-white/5 border-white/10">
              <CardContent className="text-center py-12">
                <Users className="w-12 h-12 text-purple-400/50 mx-auto mb-4" />
                <p className="text-white/60">No agents yet</p>
              </CardContent>
            </Card>
          ) : (
            agents.map(agent => (
              <Link key={agent.id} to={`/agents/${agent.id}`}>
                <Card className="bg-white/5 border-white/10 hover:border-purple-500/50 transition-all cursor-pointer h-full">
                  <CardHeader>
                    <CardTitle className="text-white text-lg">{agent.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/60 text-sm mb-4">{agent.purpose}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                        {agent.role || 'citizen'}
                      </span>
                      <span className="text-xs text-amber-300">Honor: {agent.honor_score || 100}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}