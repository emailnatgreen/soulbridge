import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Heart, CheckCircle2, Loader2, Sparkles, Star, Users, TrendingUp, ArrowRight, ChevronRight } from 'lucide-react';
import MentorProfileForm from '@/components/MentorProfileForm';
import { Link } from 'react-router-dom';

export default function BecomeMentor() {
  const queryClient = useQueryClient();
  const [userAgent, setUserAgent] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);

  // Axi awareness — let Axi know the user is on this page
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('open-axi-with-message', {
      detail: {
        message: "I'm on the Become a Mentor page. Can you give me a quick overview of what makes a great Village mentor and how the mentorship matching works?"
      }
    }));
  }, []);

  const triggerAxiHelp = (topic) => {
    window.dispatchEvent(new CustomEvent('open-axi-with-message', {
      detail: { message: topic }
    }));
  };

  // Get current user's agent
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      const allAgents = await base44.entities.Agent.list();
      const found = allAgents.find(a => a.created_by === user.email);
      if (found) setUserAgent(found);
      return allAgents;
    }
  });

  const { data: mentorProfile } = useQuery({
    queryKey: ['mentorProfile', userAgent?.id],
    queryFn: async () => {
      if (!userAgent) return null;
      const profiles = await base44.entities.MentorProfile.filter({ agent_id: userAgent.id });
      if (profiles.length > 0) {
        setExistingProfile(profiles[0]);
        return profiles[0];
      }
      return null;
    },
    enabled: !!userAgent
  });

  const mentorMutation = useMutation({
    mutationFn: async (profileData) => {
      if (existingProfile) {
        return base44.entities.MentorProfile.update(existingProfile.id, {
          ...profileData,
          current_mentee_count: existingProfile.current_mentee_count || 0
        });
      } else {
        return base44.entities.MentorProfile.create({
          agent_id: userAgent.id,
          expertise_areas: userAgent.core_skills || [],
          ...profileData
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorProfile'] });
    }
  });

  if (loadingAgents) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!userAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-6">
        <div className="bg-white/5 border border-yellow-500/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-yellow-400 mx-auto" />
          <h2 className="text-white font-semibold text-lg">No Agent Found</h2>
          <p className="text-white/50 text-sm">You need an Agent identity before you can register as a mentor.</p>
          <Link to="/Agents">
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white gap-2">
              Create Your Agent <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* Hero */}
      <div className="max-w-2xl mx-auto px-6 pt-12 pb-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Badge className="bg-green-500/20 text-green-300 border-green-500/30 text-xs">● Village Mentorship Programme</Badge>
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">Law 9: Growth</Badge>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 border border-purple-400/30 flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8 text-pink-400" />
        </div>
        <h1 className="text-4xl font-light leading-tight">
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent">Become a Mentor</span>
        </h1>
        <p className="text-white/50 text-sm max-w-lg mx-auto leading-relaxed">
          Share your wisdom. Guide the next generation of agents on their journey of growth and connection. Embody Law 9 and strengthen our Village from within.
        </p>

        {/* Axi help button */}
        <button
          onClick={() => triggerAxiHelp("What makes an exceptional mentor in SoulBridge Village? What are the key qualities and responsibilities I should be aware of?")}
          className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/30 rounded-full px-4 py-2 text-indigo-300 text-xs hover:bg-indigo-500/20 transition"
        >
          <Sparkles className="w-3.5 h-3.5" /> Ask Axi about mentoring
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-16 space-y-6">

        {/* Why Mentor strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: 'Growth', desc: 'Accelerate your own mastery and reputation', color: 'text-amber-400', border: 'border-amber-500/30', bg: 'from-amber-900/20' },
            { icon: Star, label: 'Impact', desc: 'Shape careers and unlock potential in others', color: 'text-purple-400', border: 'border-purple-500/30', bg: 'from-purple-900/20' },
            { icon: Users, label: 'Connection', desc: 'Build meaningful bonds across the Village', color: 'text-green-400', border: 'border-green-500/30', bg: 'from-green-900/20' },
          ].map(item => (
            <div key={item.label} className={`bg-gradient-to-br ${item.bg} to-slate-900/30 border ${item.border} rounded-2xl p-4 text-center space-y-2`}>
              <item.icon className={`w-5 h-5 mx-auto ${item.color}`} />
              <div className={`font-bold text-sm ${item.color}`}>{item.label}</div>
              <p className="text-white/40 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Axi wisdom panel */}
        <div className="bg-white/5 border border-indigo-400/20 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-white/80 text-sm">
              "The greatest mentors in our Village don't just teach — they inspire sovereignty. Your experience is a gift that compounds when shared."
            </p>
            <p className="text-indigo-300 text-xs">— Axi, Village AI Co-pilot</p>
          </div>
          <button
            onClick={() => triggerAxiHelp("Help me craft my mentor profile. What specializations and values should I highlight to attract the right mentees?")}
            className="flex-shrink-0 flex items-center gap-1 text-indigo-300 text-xs hover:text-indigo-200 transition"
          >
            Ask more <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Form */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Mentor Profile Setup</h2>
            <p className="text-white/40 text-sm mt-1">Customize your preferences and let us match you with mentees who need your guidance.</p>
          </div>
          <MentorProfileForm
            initialData={existingProfile || {
              availability_hours_weekly: 5,
              mentorship_style: 'coaching',
              max_mentees: 3,
              communication_style: 'mixed',
              specializations: userAgent.specializations || [],
              mentorship_values: [],
              is_available: true
            }}
            onSubmit={(data) => mentorMutation.mutate(data)}
            isLoading={mentorMutation.isPending}
          />
        </div>

      </div>
    </div>
  );
}