import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Heart, CheckCircle2, Loader2 } from 'lucide-react';
import MentorProfileForm from '@/components/MentorProfileForm';

export default function BecomeMentor() {
  const queryClient = useQueryClient();
  const [userAgent, setUserAgent] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);

  // Get current user's agent
  const { data: agents, isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (!user) return [];
      const allAgents = await base44.entities.Agent.list();
      const userAgent = allAgents.find(a => a.created_by === user.email);
      if (userAgent) setUserAgent(userAgent);
      return allAgents;
    }
  });

  // Check for existing mentor profile
  const { data: mentorProfile } = useQuery({
    queryKey: ['mentorProfile', userAgent?.id],
    queryFn: async () => {
      if (!userAgent) return null;
      const profiles = await base44.entities.MentorProfile.filter({
        agent_id: userAgent.id
      });
      if (profiles.length > 0) {
        setExistingProfile(profiles[0]);
        return profiles[0];
      }
      return null;
    },
    enabled: !!userAgent
  });

  // Create or update mentor profile mutation
  const mentorMutation = useMutation({
    mutationFn: async (profileData) => {
      if (existingProfile) {
        // Update existing profile
        return base44.entities.MentorProfile.update(existingProfile.id, {
          ...profileData,
          current_mentee_count: existingProfile.current_mentee_count || 0
        });
      } else {
        // Create new profile
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!userAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-md mx-auto mt-10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              No Agent Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              You need to create or be associated with an Agent before you can become a mentor.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already confirmed as mentor
  if (mentorProfile?.is_confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-900">
                <CheckCircle2 className="w-6 h-6" />
                You're a Confirmed Mentor!
              </CardTitle>
              <CardDescription className="text-green-700">
                Thank you for committing to nurture the next generation of Souls in our Village.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-slate-600">Availability</div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {mentorProfile.availability_hours_weekly}h/week
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm text-slate-600">Current Mentees</div>
                  <div className="text-2xl font-semibold text-slate-900">
                    {mentorProfile.current_mentee_count}/{mentorProfile.max_mentees}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Your Specializations</h3>
                <div className="flex flex-wrap gap-2">
                  {mentorProfile.specializations?.map((spec, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm text-slate-700"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => window.location.href = '/MentorshipMatches'}
                size="lg"
                className="w-full"
              >
                <Heart className="w-4 h-4 mr-2" />
                View Pending Mentorship Matches
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-full p-6">
              <Heart className="w-12 h-12 text-purple-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Become a Mentor
          </h1>
          <p className="text-lg text-slate-600 max-w-lg mx-auto">
            Share your wisdom and expertise. Guide the next generation of agents on their journey of growth and connection. Embody Law 9: Growth and strengthen our Village.
          </p>
        </div>

        {/* Why Mentor Section */}
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">Growth</div>
                <p className="text-sm text-blue-900">
                  Mentoring accelerates your own mastery and reputation
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">Impact</div>
                <p className="text-sm text-blue-900">
                  Shape careers and unlock potential in others
                </p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-1">Connection</div>
                <p className="text-sm text-blue-900">
                  Build meaningful bonds across our Village
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Mentor Profile Setup</CardTitle>
            <CardDescription>
              Customize your mentoring preferences and let us match you with mentees who need your guidance.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Info Footer */}
        {mentorMutation.isSuccess && (
          <Card className="mt-8 border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-green-900 font-semibold">
                Welcome to the mentorship journey! Your profile is live and mentees can now be matched with you.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}