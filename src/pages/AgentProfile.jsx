import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Star, Briefcase, Award, Zap, Globe, MessageCircle, Edit, ExternalLink } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '../utils';

export default function AgentProfile() {
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get('id');

  const { data: agent, isLoading } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => base44.entities.Agent.get(agentId),
    enabled: !!agentId
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['agent-listings', agentId],
    queryFn: () => base44.entities.MarketplaceListing.filter({ agent_id: agentId }),
    enabled: !!agentId
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ['agent-contracts', agentId],
    queryFn: () => base44.entities.MarketplaceContract.filter({ seller_agent_id: agentId, status: 'completed' }),
    enabled: !!agentId
  });

  if (isLoading || !agent) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  const completedContracts = contracts.length;
  const averageRating = contracts.reduce((sum, c) => sum + (c.review?.rating || 0), 0) / (completedContracts || 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to={createPageUrl('Agents')}>
              <Button variant="ghost" size="icon" className="text-white/80 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <Link to={createPageUrl('EditAgentProfile') + `?id=${agent.id}`}>
              <Button variant="outline" className="border-white/10 text-white">
                <Edit className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Hero Section */}
        <Card className="bg-white/5 backdrop-blur-xl border-white/10 mb-6">
          <CardContent className="pt-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                  {agent.name.charAt(0)}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-4">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">{agent.name}</h1>
                  {agent.tagline && (
                    <p className="text-lg text-purple-300/80">{agent.tagline}</p>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className="bg-purple-500/20 text-purple-300">{agent.role}</Badge>
                    <Badge className={
                      agent.availability_status === 'available' ? 'bg-green-500/20 text-green-300' :
                      agent.availability_status === 'busy' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'
                    }>
                      {agent.availability_status || 'available'}
                    </Badge>
                    {agent.hourly_rate_rlusd && (
                      <Badge className="bg-blue-500/20 text-blue-300">
                        {agent.hourly_rate_rlusd} RLUSD/hr
                      </Badge>
                    )}
                  </div>
                </div>

                {agent.bio && (
                  <p className="text-white/80 leading-relaxed">{agent.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{agent.honor_score}</div>
                    <div className="text-xs text-white/60">Honor</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
                      {averageRating > 0 ? averageRating.toFixed(1) : 'N/A'}
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    </div>
                    <div className="text-xs text-white/60">Rating</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{completedContracts}</div>
                    <div className="text-xs text-white/60">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{listings.filter(l => l.status === 'available').length}</div>
                    <div className="text-xs text-white/60">Services</div>
                  </div>
                </div>

                {/* Social Links */}
                {agent.social_links && (
                  <div className="flex gap-2">
                    {agent.social_links.website && (
                      <Button size="sm" variant="outline" className="border-white/10" asChild>
                        <a href={agent.social_links.website} target="_blank" rel="noopener noreferrer">
                          <Globe className="w-4 h-4 mr-2" />
                          Website
                        </a>
                      </Button>
                    )}
                    {agent.social_links.github && (
                      <Button size="sm" variant="outline" className="border-white/10" asChild>
                        <a href={agent.social_links.github} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          GitHub
                        </a>
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview" className="data-[state=active]:bg-purple-600">Overview</TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-purple-600">Skills</TabsTrigger>
            <TabsTrigger value="portfolio" className="data-[state=active]:bg-purple-600">Portfolio</TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-purple-600">Reviews</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Specializations */}
            {agent.specializations && agent.specializations.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-purple-400" />
                    Specializations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {agent.specializations.map((spec, idx) => (
                      <Badge key={idx} className="bg-purple-500/20 text-purple-300">
                        {spec}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services */}
            {listings.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    Services Offered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {listings.map(listing => (
                      <div key={listing.id} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-white font-medium">{listing.title}</h3>
                            <p className="text-sm text-white/60 mt-1">{listing.description}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-white">{listing.price_rlusd}</div>
                            <div className="text-xs text-white/50">RLUSD</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievements */}
            {agent.achievements && agent.achievements.length > 0 && (
              <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Award className="w-5 h-5 text-purple-400" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agent.achievements.map((achievement, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                        <div className="text-2xl">{achievement.icon || '🏆'}</div>
                        <div>
                          <h4 className="text-white font-medium">{achievement.title}</h4>
                          <p className="text-sm text-white/60">{achievement.description}</p>
                          {achievement.date && (
                            <p className="text-xs text-white/40 mt-1">{new Date(achievement.date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="skills">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Core Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {agent.core_skills && agent.core_skills.length > 0 ? (
                    agent.core_skills.map((skill, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{skill.name}</span>
                          <span className="text-purple-300">{skill.level}/10</span>
                        </div>
                        <Progress value={skill.level * 10} className="h-2" />
                        {skill.description && (
                          <p className="text-sm text-white/60">{skill.description}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">No skills listed yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="portfolio">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Portfolio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {agent.portfolio && agent.portfolio.length > 0 ? (
                    agent.portfolio.map((item, idx) => (
                      <div key={idx} className="rounded-lg overflow-hidden bg-white/5 border border-white/10">
                        {item.image_url && (
                          <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover" />
                        )}
                        <div className="p-4">
                          <h3 className="text-white font-medium mb-2">{item.title}</h3>
                          <p className="text-sm text-white/60 mb-3">{item.description}</p>
                          <div className="flex items-center justify-between">
                            {item.date && (
                              <span className="text-xs text-white/40">{new Date(item.date).toLocaleDateString()}</span>
                            )}
                            {item.link && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={item.link} target="_blank" rel="noopener noreferrer">
                                  View <ExternalLink className="w-3 h-3 ml-1" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8 col-span-2">No portfolio items yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Testimonials & Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {agent.testimonials && agent.testimonials.length > 0 ? (
                    agent.testimonials.map((testimonial, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-white/5 border border-white/10">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-white/60">
                            {new Date(testimonial.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-white/80 italic">"{testimonial.text}"</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/60 text-center py-8">No reviews yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}