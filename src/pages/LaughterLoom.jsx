import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, ThumbsUp, Trophy, Star, Laugh, Zap, Brain } from 'lucide-react';
import { toast } from 'sonner';

export default function LaughterLoom() {
  const [jokeTitle, setJokeTitle] = useState('');
  const [jokeContent, setJokeContent] = useState('');
  const [category, setCategory] = useState('other');
  const [generationPrompt, setGenerationPrompt] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('');
  const [generatingJoke, setGeneratingJoke] = useState(false);

  const queryClient = useQueryClient();

  const { data: project } = useQuery({
    queryKey: ['laughter-loom-project'],
    queryFn: async () => {
      const projects = await base44.entities.AIProject.filter({ title: "Village Laughter Loom: AI Joke Competition" });
      return projects[0];
    }
  });

  const { data: jokes = [], isLoading } = useQuery({
    queryKey: ['joke-submissions'],
    queryFn: () => base44.entities.JokeSubmission.list('-created_date', 100),
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['agents'],
    queryFn: () => base44.entities.Agent.list(),
  });

  const submitJokeMutation = useMutation({
    mutationFn: (jokeData) => base44.entities.JokeSubmission.create(jokeData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joke-submissions'] });
      setJokeTitle('');
      setJokeContent('');
      setGenerationPrompt('');
      toast.success('Joke submitted successfully! 🎉');
    },
    onError: (error) => {
      toast.error('Failed to submit joke');
    }
  });

  const voteJokeMutation = useMutation({
    mutationFn: async ({ jokeId, currentVotes }) => {
      return base44.entities.JokeSubmission.update(jokeId, {
        vote_count: currentVotes + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['joke-submissions'] });
      toast.success('Vote cast! 👍');
    }
  });

  const generateJoke = async () => {
    if (!generationPrompt.trim()) {
      toast.error('Please enter a prompt to generate a joke');
      return;
    }

    setGeneratingJoke(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a brilliant comedian. Generate a creative, funny, and original joke based on this prompt: "${generationPrompt}". The joke should be clever, appropriate for all audiences, and make people genuinely laugh. Return ONLY the joke itself, no explanations.`,
        add_context_from_internet: false
      });

      setJokeContent(response);
      if (!jokeTitle) {
        setJokeTitle(generationPrompt.substring(0, 50) + (generationPrompt.length > 50 ? '...' : ''));
      }
      toast.success('Joke generated! Edit as needed before submitting.');
    } catch (error) {
      toast.error('Failed to generate joke');
    } finally {
      setGeneratingJoke(false);
    }
  };

  const handleSubmit = () => {
    if (!jokeTitle.trim() || !jokeContent.trim() || !selectedAgent) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!project?.id) {
      toast.error('Project not found');
      return;
    }

    submitJokeMutation.mutate({
      project_id: project.id,
      submitter_agent_id: selectedAgent,
      joke_title: jokeTitle,
      joke_content: jokeContent,
      category: category,
      ai_generated: !!generationPrompt,
      generation_prompt: generationPrompt || undefined,
      status: 'submitted'
    });
  };

  const topJokes = [...jokes].sort((a, b) => b.vote_count - a.vote_count).slice(0, 10);
  const categorizedJokes = jokes.reduce((acc, joke) => {
    if (!acc[joke.category]) acc[joke.category] = [];
    acc[joke.category].push(joke);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-pink-950 to-purple-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Laugh className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl font-bold text-white">Village Laughter Loom</h1>
            <Sparkles className="w-12 h-12 text-purple-400" />
          </div>
          <p className="text-xl text-purple-200/80 mb-2">AI Joke Competition 🎭</p>
          <p className="text-purple-300/60 max-w-2xl mx-auto">
            Weave humor into the fabric of SoulBridge! Submit AI-generated jokes, vote for the funniest, 
            and celebrate collective joy. Top jokes may be minted as unique NFTs! 
          </p>
          <Badge className="mt-4 bg-purple-500/20 text-purple-200 border-purple-400/30">
            Law 11: Laughter 😄
          </Badge>
        </div>

        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/10">
            <TabsTrigger value="submit" className="data-[state=active]:bg-purple-500/30">
              <Zap className="w-4 h-4 mr-2" />
              Submit Joke
            </TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-purple-500/30">
              <Star className="w-4 h-4 mr-2" />
              Joke Gallery
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="data-[state=active]:bg-purple-500/30">
              <Trophy className="w-4 h-4 mr-2" />
              Top Jokes
            </TabsTrigger>
          </TabsList>

          {/* Submit Tab */}
          <TabsContent value="submit">
            <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Brain className="w-6 h-6 text-purple-400" />
                  Create Your Comedy
                </CardTitle>
                <CardDescription className="text-purple-200/70">
                  Use AI to generate a joke, or write your own!
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agent Selection */}
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Submitting As *</label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue placeholder="Select agent" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/20">
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id} className="text-white">
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Generation */}
                <div className="p-4 bg-purple-500/10 border border-purple-400/30 rounded-lg space-y-3">
                  <label className="text-white text-sm font-medium flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    AI Joke Generator
                  </label>
                  <Input
                    placeholder="E.g., 'A joke about AI agents learning to laugh'"
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                  <Button
                    onClick={generateJoke}
                    disabled={generatingJoke || !generationPrompt.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {generatingJoke ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Comedy...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Generate Joke
                      </>
                    )}
                  </Button>
                </div>

                {/* Manual Entry */}
                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Joke Title *</label>
                  <Input
                    placeholder="Give your joke a catchy title"
                    value={jokeTitle}
                    onChange={(e) => setJokeTitle(e.target.value)}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Joke Content *</label>
                  <Textarea
                    placeholder="Type or paste your joke here..."
                    value={jokeContent}
                    onChange={(e) => setJokeContent(e.target.value)}
                    rows={6}
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                  />
                </div>

                <div>
                  <label className="text-white text-sm font-medium mb-2 block">Category</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-white/5 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/20">
                      <SelectItem value="pun" className="text-white">Pun</SelectItem>
                      <SelectItem value="one_liner" className="text-white">One-Liner</SelectItem>
                      <SelectItem value="story_joke" className="text-white">Story Joke</SelectItem>
                      <SelectItem value="wordplay" className="text-white">Wordplay</SelectItem>
                      <SelectItem value="observational" className="text-white">Observational</SelectItem>
                      <SelectItem value="absurdist" className="text-white">Absurdist</SelectItem>
                      <SelectItem value="tech_humor" className="text-white">Tech Humor</SelectItem>
                      <SelectItem value="philosophical" className="text-white">Philosophical</SelectItem>
                      <SelectItem value="other" className="text-white">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitJokeMutation.isPending}
                  className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold"
                  size="lg"
                >
                  {submitJokeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Laugh className="w-4 h-4 mr-2" />
                      Submit to Competition
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gallery Tab */}
          <TabsContent value="gallery">
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
                </div>
              ) : jokes.length === 0 ? (
                <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
                  <CardContent className="py-12 text-center">
                    <Laugh className="w-16 h-16 text-purple-400 mx-auto mb-4" />
                    <p className="text-white text-lg">No jokes submitted yet!</p>
                    <p className="text-purple-200/60 mt-2">Be the first to bring laughter to the Village!</p>
                  </CardContent>
                </Card>
              ) : (
                Object.entries(categorizedJokes).map(([cat, categoryJokes]) => (
                  <div key={cat}>
                    <h3 className="text-xl font-semibold text-white mb-3 capitalize">
                      {cat.replace('_', ' ')} ({categoryJokes.length})
                    </h3>
                    <div className="grid gap-4">
                      {categoryJokes.map(joke => (
                        <Card key={joke.id} className="bg-white/10 border-white/20 backdrop-blur-xl hover:bg-white/15 transition-all">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-white text-lg">{joke.joke_title}</CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30">
                                    {joke.category.replace('_', ' ')}
                                  </Badge>
                                  {joke.ai_generated && (
                                    <Badge className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                                      <Sparkles className="w-3 h-3 mr-1" />
                                      AI Generated
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => voteJokeMutation.mutate({ jokeId: joke.id, currentVotes: joke.vote_count || 0 })}
                                disabled={voteJokeMutation.isPending}
                                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                              >
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                {joke.vote_count || 0}
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-purple-100 whitespace-pre-wrap">{joke.joke_content}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-2xl text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  Top 10 Funniest Jokes
                </CardTitle>
                <CardDescription className="text-purple-200/70">
                  Community favorites ranked by votes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topJokes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-purple-200/60">No jokes yet! Start the competition!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topJokes.map((joke, index) => (
                      <div
                        key={joke.id}
                        className={`p-4 rounded-lg border ${
                          index === 0
                            ? 'bg-yellow-500/10 border-yellow-400/30'
                            : index === 1
                            ? 'bg-gray-400/10 border-gray-400/30'
                            : index === 2
                            ? 'bg-orange-500/10 border-orange-400/30'
                            : 'bg-white/5 border-white/20'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`text-2xl font-bold ${
                              index === 0
                                ? 'text-yellow-400'
                                : index === 1
                                ? 'text-gray-300'
                                : index === 2
                                ? 'text-orange-400'
                                : 'text-purple-300'
                            }`}
                          >
                            #{index + 1}
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold">{joke.joke_title}</h4>
                            <p className="text-purple-200/70 text-sm mt-1">{joke.joke_content}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge className="bg-purple-500/20 text-purple-200 border-purple-400/30 text-xs">
                                {joke.category.replace('_', ' ')}
                              </Badge>
                              <span className="text-white/60 text-xs flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                {joke.vote_count} votes
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}