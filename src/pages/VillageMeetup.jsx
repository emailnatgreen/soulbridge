import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Megaphone, Target, AlertTriangle, Lightbulb, RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const INPUT_TYPES = [
  { value: "need", label: "Community Need", icon: Target, color: "bg-blue-100 text-blue-800" },
  { value: "challenge", label: "Challenge / Blocker", icon: AlertTriangle, color: "bg-red-100 text-red-800" },
  { value: "idea", label: "Idea / Proposal", icon: Lightbulb, color: "bg-yellow-100 text-yellow-800" },
  { value: "announcement", label: "Announcement", icon: Megaphone, color: "bg-purple-100 text-purple-800" },
];

function InputTypeIcon({ type }) {
  const config = INPUT_TYPES.find(t => t.value === type) || INPUT_TYPES[0];
  const Icon = config.icon;
  return <Icon className="w-4 h-4" />;
}

export default function VillageMeetup() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", type: "need", project_id: "" });

  const { data: agents = [] } = useQuery({
    queryKey: ["agents-active"],
    queryFn: () => base44.entities.Agent.filter({ status: "active" }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-active"],
    queryFn: () => base44.entities.AIProject.filter({ status: "active" }),
  });

  // Community inputs are stored as ProjectTasks with task_type=research/storytelling linked to any project
  // We use GovernanceProposal as the community input vehicle for meetup entries
  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ["meetup-proposals"],
    queryFn: () => base44.entities.GovernanceProposal.list("-created_date", 50),
  });

  const runMeetupMutation = useMutation({
    mutationFn: () => base44.functions.invoke("dailyVillageMeetup", {}),
    onSuccess: () => {
      toast.success("Village Meetup triggered! Agents notified and tasks assigned.");
      queryClient.invalidateQueries({ queryKey: ["meetup-proposals"] });
    },
    onError: (e) => toast.error("Meetup failed: " + e.message),
  });

  const submitInputMutation = useMutation({
    mutationFn: (data) => base44.entities.GovernanceProposal.create(data),
    onSuccess: () => {
      toast.success("Community input submitted to the Village!");
      queryClient.invalidateQueries({ queryKey: ["meetup-proposals"] });
      setShowForm(false);
      setForm({ title: "", description: "", type: "need", project_id: "" });
    },
    onError: (e) => toast.error("Submission failed: " + e.message),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Please enter a title.");
    submitInputMutation.mutate({
      title: form.title,
      description: form.description,
      proposal_type: "community_input",
      status: "draft",
      tags: [form.type, "meetup", "pipe1"],
      metadata: { input_type: form.type, linked_project_id: form.project_id }
    });
  };

  const statusColor = {
    draft: "bg-gray-100 text-gray-700",
    active: "bg-green-100 text-green-800",
    passed: "bg-blue-100 text-blue-800",
    rejected: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Village Meetup</h1>
              <Badge className="bg-purple-700 text-purple-100">Pipe 1 — Community Input</Badge>
            </div>
            <p className="text-purple-300 text-sm ml-13 pl-0">
              Law 8: Governance — Those who dwell, decide.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="border-purple-500 text-purple-200 hover:bg-purple-800"
              onClick={() => runMeetupMutation.mutate()}
              disabled={runMeetupMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${runMeetupMutation.isPending ? "animate-spin" : ""}`} />
              Run Daily Meetup
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Submit Input
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {INPUT_TYPES.map(type => {
            const count = proposals.filter(p => p.metadata?.input_type === type.value).length;
            const Icon = type.icon;
            return (
              <Card key={type.value} className="bg-slate-800/60 border-slate-700">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-xs text-slate-400">{type.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Submit Form */}
        {showForm && (
          <Card className="bg-slate-800/80 border-purple-600/50 mb-8">
            <CardHeader>
              <CardTitle className="text-white text-lg">Submit Community Input</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Input Type</label>
                    <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INPUT_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-1 block">Link to Project (optional)</label>
                    <Select value={form.project_id} onValueChange={v => setForm({ ...form, project_id: v })}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Title *</label>
                  <Input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="What does the Village need to know?"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 mb-1 block">Description</label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Share the full context, impact, and any proposed solutions..."
                    rows={4}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" className="text-slate-400" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={submitInputMutation.isPending}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {submitInputMutation.isPending ? "Submitting..." : "Submit to Village"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Active Agents */}
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-purple-400" />
          <span className="text-purple-300 text-sm font-medium">{agents.length} active agents in the Village</span>
        </div>

        {/* Community Input Feed */}
        <div className="space-y-3">
          <h2 className="text-white font-semibold text-lg">Community Input Feed</h2>
          {isLoading && (
            <div className="text-slate-400 text-center py-8">Loading community inputs...</div>
          )}
          {!isLoading && proposals.length === 0 && (
            <Card className="bg-slate-800/40 border-slate-700">
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No community inputs yet.</p>
                <p className="text-slate-500 text-sm mt-1">Be the first to submit — the Village listens.</p>
              </CardContent>
            </Card>
          )}
          {proposals.map(p => {
            const inputType = INPUT_TYPES.find(t => t.value === p.metadata?.input_type);
            return (
              <Card key={p.id} className="bg-slate-800/60 border-slate-700 hover:border-purple-600/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center mt-0.5 shrink-0">
                        <InputTypeIcon type={p.metadata?.input_type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{p.title}</p>
                        {p.description && (
                          <p className="text-slate-400 text-sm mt-1 line-clamp-2">{p.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {inputType && (
                            <Badge className={inputType.color + " text-xs"}>{inputType.label}</Badge>
                          )}
                          {p.tags?.filter(t => !["meetup", "pipe1"].includes(t)).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs border-slate-600 text-slate-400">{tag}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge className={statusColor[p.status] || "bg-gray-100 text-gray-700"}>
                        {p.status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {new Date(p.created_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}