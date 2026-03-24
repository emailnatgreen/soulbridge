import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SkillCard from './SkillCard';
import { Search, Filter, AlertCircle, Loader } from 'lucide-react';

export default function SkillDirectoryPanel({ currentUser, agents = [] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  // Fetch all master skills
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skillDirectory'],
    queryFn: () => base44.entities.Skill?.list?.('-created_date', 200) || Promise.resolve([]),
    staleTime: 15000,
  });

  // Fetch mentor profiles to match skills to mentors
  const { data: mentorProfiles = [] } = useQuery({
    queryKey: ['mentorProfiles'],
    queryFn: () => base44.entities.MentorProfile?.list?.('-created_date', 100) || Promise.resolve([]),
    staleTime: 15000,
  });

  // Fetch existing mentorship requests for current user
  const { data: existingMentorships = [] } = useQuery({
    queryKey: ['userMentorships', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.MentorshipRelationship?.filter?.({ mentee_agent_id: currentUser.id }, '-created_date', 100) || [];
    },
    staleTime: 10000,
    enabled: !!currentUser,
  });

  // Create mentorship request mutation
  const createMentorshipMutation = useMutation({
    mutationFn: async ({ skillId, mentorAgentId }) => {
      if (!currentUser) throw new Error('User not authenticated');
      
      return base44.entities.MentorshipRelationship.create({
        mentor_agent_id: mentorAgentId,
        mentee_agent_id: currentUser.id,
        focus_areas: [skillId],
        skill_focus_ids: [skillId],
        status: 'requested',
      });
    },
    onSuccess: () => {
      // Show success toast or refetch mentorships
      alert('Mentorship request sent!');
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  // Map skills to mentors
  const skillsWithMentors = useMemo(() => {
    return skills.map(skill => {
      const mentor = mentorProfiles.find(m =>
        m.expertise_areas?.some(ea => ea.skill_name?.toLowerCase() === skill.name?.toLowerCase())
      );
      const mentorAgent = mentor ? agents.find(a => a.id === mentor.agent_id) : null;

      return {
        ...skill,
        mentor: mentorAgent,
        mentorProfile: mentor,
      };
    });
  }, [skills, mentorProfiles, agents]);

  // Filter and search
  const filteredSkills = useMemo(() => {
    return skillsWithMentors.filter(skill => {
      const matchesSearch = searchQuery === '' ||
        skill.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        skill.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || skill.category === categoryFilter;
      
      const matchesAvailability = availabilityFilter === 'all' ||
        (availabilityFilter === 'has-mentor' && skill.mentor) ||
        (availabilityFilter === 'no-mentor' && !skill.mentor);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [skillsWithMentors, searchQuery, categoryFilter, availabilityFilter]);

  const uniqueCategories = ['all', ...new Set(skills.map(s => s.category))];

  const handleRequestMentorship = (skillId, mentorAgentId) => {
    if (!mentorAgentId) {
      alert('No mentor available for this skill yet.');
      return;
    }
    createMentorshipMutation.mutate({ skillId, mentorAgentId });
  };

  if (skillsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-teal-400 animate-spin" />
      </div>
    );
  }

  if (skills.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-white/40 mx-auto" />
        <p className="text-white/60">No skills in the Village directory yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search skills by name or description..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-teal-400/50"
          />
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs uppercase text-white/60 tracking-wide flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" /> Category
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {uniqueCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  categoryFilter === cat
                    ? 'bg-teal-500/30 text-teal-300 border border-teal-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                {cat === 'all' ? 'All Skills' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Availability Filter */}
        <div className="space-y-2">
          <label className="text-xs uppercase text-white/60 tracking-wide">Mentor Availability</label>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'has-mentor', label: 'Has Mentor' },
              { value: 'no-mentor', label: 'Seeking Mentor' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setAvailabilityFilter(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  availabilityFilter === opt.value
                    ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-white/60">
          {searchQuery && <Badge className="bg-green-500/20 text-green-300 border-green-500/30">"{searchQuery}"</Badge>}
          {categoryFilter !== 'all' && <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">{categoryFilter}</Badge>}
          {availabilityFilter !== 'all' && <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">{availabilityFilter}</Badge>}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-white/60">
          Showing <span className="font-semibold text-white">{filteredSkills.length}</span> of <span className="font-semibold text-white">{skillsWithMentors.length}</span> skills
        </p>
      </div>

      {/* Skills Grid */}
      {filteredSkills.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <AlertCircle className="w-8 h-8 text-white/40 mx-auto mb-3" />
          <p className="text-white/60 text-sm">No skills match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSkills.map(skill => (
            <SkillCard
              key={skill.id}
              skill={skill}
              variant="directory"
              mentor={skill.mentor}
              onRequestMentorship={handleRequestMentorship}
              isLoading={createMentorshipMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}