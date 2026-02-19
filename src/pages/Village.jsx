import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { ArrowLeft, Compass, Target, Plus, MapPin, Loader2 } from 'lucide-react';
import VillageLocationCard from '../components/VillageLocationCard';
import VillageProjectCard from '../components/VillageProjectCard';
import VillageInteractionMap from '../components/VillageInteractionMap';
import { toast } from 'sonner';

export default function VillagePage() {
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedResource, setSelectedResource] = useState(null);
    const [newProject, setNewProject] = useState({
        name: '',
        description: '',
        category: 'infrastructure',
        required_resources: { artifact: 5, knowledge: 3 },
        reward_xrp: 50
    });

    const queryClient = useQueryClient();

    const { data: user } = useQuery({
        queryKey: ['current-user'],
        queryFn: () => base44.auth.me(),
    });

    const { data: locations = [], isLoading: locationsLoading } = useQuery({
        queryKey: ['locations'],
        queryFn: () => base44.entities.VillageLocation.list(),
    });

    const { data: projects = [], isLoading: projectsLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: () => base44.entities.VillageProject.list('-created_date'),
    });

    const { data: agentResources = [] } = useQuery({
        queryKey: ['resources', user?.id],
        queryFn: () => user ? base44.entities.Resource.filter({ owner_agent_id: user.id }) : [],
        enabled: !!user,
    });

    const createProjectMutation = useMutation({
        mutationFn: async () => {
            const response = await base44.functions.invoke('createVillageProject', {
                ...newProject,
                creator_agent_id: user.id
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            setNewProject({
                name: '',
                description: '',
                category: 'infrastructure',
                required_resources: { artifact: 5, knowledge: 3 },
                reward_xrp: 50
            });
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const contributeMutation = useMutation({
        mutationFn: async () => {
            if (!selectedResource) {
                toast.error('Select a resource to contribute');
                return;
            }
            const response = await base44.functions.invoke('contributeToProject', {
                project_id: selectedProject,
                agent_id: user.id,
                resource_id: selectedResource,
                effort_hours: 1
            });
            return response.data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['resources', user.id] });
            setSelectedProject(null);
            setSelectedResource(null);
        },
        onError: (error) => {
            toast.error(error.message);
        }
    });

    const handleCreateProject = () => {
        if (!newProject.name || !newProject.description) {
            toast.error('Please fill in all fields');
            return;
        }
        createProjectMutation.mutate();
    };

    const activeProjects = projects.filter(p => p.status === 'active' || p.status === 'planning');
    const completedProjects = projects.filter(p => p.status === 'completed');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Header */}
            <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white/60 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-3xl font-light tracking-tight text-white">The Village</h1>
                            <p className="text-sm text-purple-300/60">Explore locations, gather resources, and build together</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-cyan-300/80">Locations Discovered</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{locations.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-purple-300/80">Active Projects</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{activeProjects.length}</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-green-300/80">Your Resources</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-3xl font-light text-white">{agentResources.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <Tabs defaultValue="map" className="space-y-6">
                    <TabsList className="bg-white/5 border border-white/10">
                        <TabsTrigger value="map" className="data-[state=active]:bg-green-500/20">
                            <MapPin className="w-4 h-4 mr-2" />
                            Live Map
                        </TabsTrigger>
                        <TabsTrigger value="explore" className="data-[state=active]:bg-cyan-500/20">
                            <Compass className="w-4 h-4 mr-2" />
                            Explore
                        </TabsTrigger>
                        <TabsTrigger value="projects" className="data-[state=active]:bg-purple-500/20">
                            <Target className="w-4 h-4 mr-2" />
                            Projects
                        </TabsTrigger>
                    </TabsList>

                    {/* Live Map Tab */}
                    <TabsContent value="map" className="space-y-6">
                        <Card className="bg-white/5 backdrop-blur-xl border-white/10 p-6">
                            <div className="mb-4">
                                <h2 className="text-2xl font-light text-white mb-2">Village Interaction Map</h2>
                                <p className="text-sm text-white/60">Real-time visualization of agent locations, activities, and relationships</p>
                            </div>
                            <div className="h-[600px]">
                                <VillageInteractionMap />
                            </div>
                        </Card>
                    </TabsContent>

                    {/* Explore Tab */}
                    <TabsContent value="explore" className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {locationsLoading ? (
                                <div className="col-span-full text-center py-12">
                                    <Loader2 className="w-8 h-8 text-white/40 animate-spin mx-auto" />
                                </div>
                            ) : locations.length === 0 ? (
                                <div className="col-span-full text-center py-12">
                                    <MapPin className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                    <p className="text-white/40">No locations discovered yet</p>
                                </div>
                            ) : (
                                locations.map(location => (
                                    <VillageLocationCard
                                        key={location.id}
                                        location={location}
                                        agentId={user?.id}
                                    />
                                ))
                            )}
                        </div>
                    </TabsContent>

                    {/* Projects Tab */}
                    <TabsContent value="projects" className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-light text-white">Village Projects</h2>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Project
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-slate-900 border-white/10">
                                    <DialogHeader>
                                        <DialogTitle className="text-white">Start a New Village Project</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm text-white/60 mb-2 block">Project Name</label>
                                            <Input
                                                value={newProject.name}
                                                onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                                placeholder="e.g., Community Garden"
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-white/60 mb-2 block">Description</label>
                                            <Textarea
                                                value={newProject.description}
                                                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                                placeholder="What is this project about?"
                                                className="bg-white/5 border-white/10 text-white min-h-[100px]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm text-white/60 mb-2 block">Category</label>
                                            <Select
                                                value={newProject.category}
                                                onValueChange={(value) => setNewProject({ ...newProject, category: value })}
                                            >
                                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="infrastructure">Infrastructure</SelectItem>
                                                    <SelectItem value="research">Research</SelectItem>
                                                    <SelectItem value="community">Community</SelectItem>
                                                    <SelectItem value="resource">Resource</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="text-sm text-white/60 mb-2 block">Reward XRP</label>
                                            <Input
                                                type="number"
                                                value={newProject.reward_xrp}
                                                onChange={(e) => setNewProject({ ...newProject, reward_xrp: parseFloat(e.target.value) })}
                                                className="bg-white/5 border-white/10 text-white"
                                            />
                                        </div>
                                        <Button
                                            onClick={handleCreateProject}
                                            disabled={createProjectMutation.isPending}
                                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                        >
                                            {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
                                        </Button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Active Projects */}
                        <div>
                            <h3 className="text-lg font-light text-white mb-4">In Progress</h3>
                            {activeProjects.length === 0 ? (
                                <Card className="bg-white/5 backdrop-blur-xl border-white/10">
                                    <CardContent className="py-12 text-center">
                                        <Target className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                        <p className="text-white/40">No active projects yet</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {activeProjects.map(project => (
                                        <Dialog key={project.id}>
                                            <DialogTrigger asChild>
                                                <div onClick={() => setSelectedProject(project.id)}>
                                                    <VillageProjectCard project={project} onContribute={() => setSelectedProject(project.id)} />
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle className="text-white">Contribute to {project.name}</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-sm text-white/60 mb-2 block">Select a Resource to Contribute</label>
                                                        <Select value={selectedResource || ''} onValueChange={setSelectedResource}>
                                                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                                                <SelectValue placeholder="Choose a resource..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {agentResources.length === 0 ? (
                                                                    <SelectItem disabled value="">No resources available</SelectItem>
                                                                ) : (
                                                                    agentResources.map(resource => (
                                                                        <SelectItem key={resource.id} value={resource.id}>
                                                                            {resource.name} ({resource.type}) x{resource.quantity}
                                                                        </SelectItem>
                                                                    ))
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <Button
                                                        onClick={() => contributeMutation.mutate()}
                                                        disabled={contributeMutation.isPending || !selectedResource}
                                                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                                    >
                                                        {contributeMutation.isPending ? 'Contributing...' : 'Contribute'}
                                                    </Button>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Completed Projects */}
                        {completedProjects.length > 0 && (
                            <div>
                                <h3 className="text-lg font-light text-white mb-4">Completed ({completedProjects.length})</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {completedProjects.map(project => (
                                        <VillageProjectCard key={project.id} project={project} onContribute={() => {}} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}