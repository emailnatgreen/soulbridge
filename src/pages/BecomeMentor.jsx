import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft, Heart, Sparkles, Loader2, AlertCircle, TrendingUp,
  Star, Users, ChevronRight, Shield, CheckCircle, Clock
} from 'lucide-react';
import { toast } from 'sonner';

const openAxi = (msg) => {
  window.dispatchEvent(new CustomEvent('open-axi-with-message', { detail: { message: msg } }));
};

const STYLES = [
  { value: 'coaching', label: 'Coaching' },
  { value: 'hands_on', label: 'Hands-On' },
  { value: 'advisory', label: 'Advisory' },
  { value: 'collaborative', label: 'Collaborative' },
  { value: 'socratic', label: 'Socratic' },
  { value: 'directive', label: 'Directive' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOTS = ['morning', 'afternoon', 'evening'];

export default function BecomeMentor() {
  const queryClient = useQueryClient();
  const [identity, setIdentity] = useState(null);
  const [myAgent, setMyAgent] = useState(null);
  const [form, setForm] = useState({
    availability_hours_weekly: 5,
    mentorship_style: 'coaching',
    communication_style: 'mixed',
    max_mentees: 3,
    specializations: '',
    mentorship_values: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    is_available: true,
    availability_schedule: [],
  });

  // Load identity
  useEffect(() => {
    try {
      const s = localStorage.getItem('soulbridge_identity');
      if (s) { const p = JSON.parse(s); if (p?.connected) setIdentity(p); }
    } catch (e) {}

    base44.auth.me().then(async (u) => {
      if (!u) return;
      const agents = await base44.entities.Agent.list();
      const mine = agents.find(a => a.created_by === u.email);
      if (mine) setMyAgent(mine);
    }).catch(() => {});

    openAxi("I'm on the Become a Mentor page. What makes a great Village mentor and how does mentorship matching work?");
  }, []);

  // Existing profile
  const { data: existingProfile, isLoading } = useQuery({
    queryKey: ['mentorProfile', myAgent?.id],
    enabled: !!myAgent,
    queryFn: async () => {
      const profiles = await base44.entities.MentorProfile.filter({ agent_id: myAgent.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        setForm(f => ({
          ...f,
          availability_hours_weekly: p.availability_hours_weekly || 5,
          mentorship_style: p.mentorship_style || 'coaching',
          communication_style: p.communication_style || 'mixed',
          max_mentees: p.max_mentees || 3,
          specializations: (p.specializations || []).join(', '),
          mentorship_values: (p.mentorship_values || []).join(', '),
          timezone: p.timezone || f.timezone,
          is_available: p.is_available ?? true,
          availability_schedule: p.availability_schedule || [],
        }));
        return p;
      }
      return null;
    }
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const data = {
        agent_id: myAgent.id,
        availability_hours_weekly: Number(form.availability_hours_weekly),
        mentorship_style: form.mentorship_style,
        communication_style: form.communication_style,
        max_mentees: Number(form.max_mentees),
        specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
        mentorship_values: form.mentorship_values.split(',').map(s => s.trim()).filter(Boolean),
        timezone: form.timezone,
        is_available: form.is_available,
        is_confirmed: true,
        availability_schedule: form.availability_schedule,
        expertise_areas: myAgent.core_skills || [],
      };
      if (existingProfile) {
        return base44.entities.MentorProfile.update(existingProfile.id, data);
      }
      return base44.entities.MentorProfile.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentorProfile'] });
      queryClient.invalidateQueries({ queryKey: ['mentorProfiles'] });
      toast.success(existingProfile ? 'Mentor profile updated!' : 'Mentor profile created! Welcome to the programme.');
      openAxi("My mentor profile has just been saved. What should I do next to attract mentees and get started?");
    }
  });

  const toggleScheduleSlot = (day, slot) => {
    setForm(f => {
      const schedule = [...(f.availability_schedule || [])];
      const dayEntry = schedule.find(s => s.day === day);
      if (!dayEntry) {
        schedule.push({ day, slots: [slot] });
      } else {
        dayEntry.slots = dayEntry.slots.includes(slot)
          ? dayEntry.slots.filter(s => s !== slot)
          : [...dayEntry.slots, slot];
        if (dayEntry.slots.length === 0) {
          return { ...f, availability_schedule: schedule.filter(s => s.day !== day) };
        }
      }
      return { ...f, availability_schedule: schedule };
    });
  };

  const isSlotActive = (day, slot) => {
    const entry = form.availability_schedule?.find(s => s.day === day);
    return entry?.slots?.includes(slot) || false;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white">

      {/* Header */}
      <div className="border-b border-white/10 bg-black/30 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/MentorshipHub">
              <Button variant="ghost" size="icon" className="text-white/60 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-white font-semibold text-lg leading-tight">Become a Mentor</h1>
              <p className="text-purple-300/50 text-xs">Law 9: Every Soul May Become More</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {identity?.connected && (
              <div
                className="flex items-center gap-1.5 bg-green-500/10 border border-green-500/30 rounded-lg px-2.5 py-1.5 cursor-pointer"
                onClick={() => openAxi(`I'm a DID user with identity ${identity.did}. What mentoring style suits my profile?`)}
              >
                <Shield className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-300 text-xs font-mono">{identity.did?.slice(0, 14)}…</span>
                <Sparkles className="w-3 h-3 text-green-400/60" />
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => openAxi("What makes an exceptional mentor in SoulBridge Village? What are the key qualities and responsibilities?")}
              className="border-purple-400/40 text-purple-300 bg-purple-900/20 hover:bg-purple-500/20 text-xs gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Ask Axi
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* No agent warning */}
        {!myAgent && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-yellow-300 text-sm font-medium">No Agent Identity Found</p>
              <p className="text-yellow-300/60 text-xs mt-0.5">You need an Agent before you can become a mentor.</p>
            </div>
            <Link to="/Agents">
              <Button size="sm" className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 text-xs">Create Agent</Button>
            </Link>
          </div>
        )}

        {/* Hero strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: TrendingUp, label: 'Reputation', desc: 'Grow your honour score', color: 'text-amber-400', border: 'border-amber-500/30' },
            { icon: Star, label: 'Impact', desc: 'Shape careers & growth', color: 'text-purple-400', border: 'border-purple-500/30' },
            { icon: Users, label: 'Community', desc: 'Strengthen the Village', color: 'text-green-400', border: 'border-green-500/30' },
          ].map(item => (
            <div key={item.label} className={`bg-white/5 border ${item.border} rounded-xl p-3 text-center space-y-1.5`}>
              <item.icon className={`w-4 h-4 mx-auto ${item.color}`} />
              <div className={`font-bold text-xs ${item.color}`}>{item.label}</div>
              <p className="text-white/40 text-[10px] leading-snug">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Axi wisdom card */}
        <div className="bg-white/5 border border-indigo-400/20 rounded-xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white/70 text-sm italic">"The greatest mentors in our Village don't just teach — they inspire sovereignty. Your experience compounds when shared."</p>
            <p className="text-indigo-300 text-xs mt-1">— Axi</p>
          </div>
          <button
            onClick={() => openAxi("Help me craft my mentor profile. What specializations and values should I highlight to attract the right mentees?")}
            className="flex items-center gap-1 text-indigo-300 text-xs hover:text-indigo-200 flex-shrink-0"
          >
            Ask more <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Form */}
        {myAgent && (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 space-y-5">
              <div>
                <h2 className="text-white font-semibold">{existingProfile ? 'Update Mentor Profile' : 'Create Mentor Profile'}</h2>
                <p className="text-white/40 text-xs mt-0.5">Mentoring as: <span className="text-purple-300">{myAgent.name}</span></p>
              </div>

              {/* Style */}
              <div>
                <label className="text-xs text-white/60 mb-2 block">Mentorship Style</label>
                <div className="flex flex-wrap gap-2">
                  {STYLES.map(s => (
                    <button
                      key={s.value}
                      onClick={() => setForm(f => ({ ...f, mentorship_style: s.value }))}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                        form.mentorship_style === s.value
                          ? 'bg-purple-600 border-purple-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-purple-400/40 hover:text-white'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Communication style */}
              <div>
                <label className="text-xs text-white/60 mb-2 block">Communication Style</label>
                <div className="flex flex-wrap gap-2">
                  {['formal', 'casual', 'structured', 'flexible', 'mixed'].map(s => (
                    <button
                      key={s}
                      onClick={() => setForm(f => ({ ...f, communication_style: s }))}
                      className={`px-3 py-1.5 rounded-lg text-xs border capitalize transition ${
                        form.communication_style === s
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-white/5 border-white/10 text-white/60 hover:border-blue-400/40 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Numbers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">Hours/week available</label>
                  <Input
                    type="number"
                    min={1} max={40}
                    value={form.availability_hours_weekly}
                    onChange={e => setForm(f => ({ ...f, availability_hours_weekly: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/60 mb-1.5 block">Max concurrent mentees</label>
                  <Input
                    type="number"
                    min={1} max={10}
                    value={form.max_mentees}
                    onChange={e => setForm(f => ({ ...f, max_mentees: e.target.value }))}
                    className="bg-white/5 border-white/10 text-white text-sm"
                  />
                </div>
              </div>

              {/* Specializations */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Specializations (comma-separated)</label>
                <Input
                  value={form.specializations}
                  onChange={e => setForm(f => ({ ...f, specializations: e.target.value }))}
                  placeholder="XRPL, AI Ethics, Governance, Smart Contracts..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                />
              </div>

              {/* Values */}
              <div>
                <label className="text-xs text-white/60 mb-1.5 block">Core Values (comma-separated)</label>
                <Input
                  value={form.mentorship_values}
                  onChange={e => setForm(f => ({ ...f, mentorship_values: e.target.value }))}
                  placeholder="Integrity, Curiosity, Sovereignty, Empathy..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm"
                />
              </div>

              {/* Availability Schedule */}
              <div>
                <label className="text-xs text-white/60 mb-2 block">Weekly Availability</label>
                <div className="space-y-1.5">
                  {DAYS.map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-white/40 text-xs w-20 flex-shrink-0">{day}</span>
                      <div className="flex gap-1.5">
                        {SLOTS.map(slot => (
                          <button
                            key={slot}
                            onClick={() => toggleScheduleSlot(day, slot)}
                            className={`px-2.5 py-1 rounded text-[10px] capitalize border transition ${
                              isSlotActive(day, slot)
                                ? 'bg-green-600 border-green-500 text-white'
                                : 'bg-white/5 border-white/10 text-white/40 hover:border-green-400/30'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Availability toggle */}
              <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3">
                <div>
                  <p className="text-white text-sm font-medium">Accepting New Mentees</p>
                  <p className="text-white/40 text-xs">Toggle to pause or resume mentee intake</p>
                </div>
                <button
                  onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.is_available ? 'bg-green-500' : 'bg-white/20'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.is_available ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Commitment statement */}
              <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <p className="text-white/60 text-xs leading-relaxed">
                  By registering as a mentor, you commit to upholding <strong className="text-purple-300">Law 9 — Every Soul May Become More</strong> and agree to guide your mentees with honour, patience and care.
                </p>
              </div>

              <Button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white h-11 gap-2"
              >
                {mutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Heart className="w-4 h-4" /> {existingProfile ? 'Update Profile' : 'Register as Mentor'}</>
                }
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}