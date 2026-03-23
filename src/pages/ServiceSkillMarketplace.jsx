import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Lightbulb, Plus } from 'lucide-react';
import ServiceCard from '@/components/ServiceCard';
import SkillCard from '@/components/SkillCard';
import ServiceForm from '@/components/ServiceForm';
import SkillForm from '@/components/SkillForm';

export default function ServiceSkillMarketplace() {
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  const { data: services = [], refetch: refetchServices } = useQuery({
    queryKey: ['services'],
    queryFn: async () => base44.entities.Service.filter({ status: 'available' }, '-created_date', 100),
    staleTime: 30 * 1000,
  });

  const { data: skills = [], refetch: refetchSkills } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => base44.entities.Skill.list('-created_date', 100),
    staleTime: 30 * 1000,
  });

  const handleServiceCreated = () => {
    setShowServiceForm(false);
    refetchServices();
  };

  const handleSkillCreated = () => {
    setShowSkillForm(false);
    refetchSkills();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pb-20">
      {/* Header */}
      <div className="border-b border-white/10 bg-white/5 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-3xl font-light text-white mb-2">Village Services & Skills</h1>
          <p className="text-white/50">Discover and offer services and skills within the ecosystem</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('services')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              activeTab === 'services'
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Briefcase className="w-4 h-4" /> Services
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              activeTab === 'skills'
                ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                : 'border-white/10 text-white/50 hover:text-white'
            }`}
          >
            <Lightbulb className="w-4 h-4" /> Skills
          </button>
        </div>

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-white">Available Services</h2>
              <Button
                onClick={() => setShowServiceForm(!showServiceForm)}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Plus className="w-4 h-4" /> Offer Service
              </Button>
            </div>

            {showServiceForm && (
              <ServiceForm onSuccess={handleServiceCreated} />
            )}

            {services.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <ServiceCard key={service.id} service={service} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6 text-center">
                  <p className="text-white/40">No services available yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === 'skills' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold text-white">Available Skills</h2>
              <Button
                onClick={() => setShowSkillForm(!showSkillForm)}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
              >
                <Plus className="w-4 h-4" /> Add Skill
              </Button>
            </div>

            {showSkillForm && (
              <SkillForm onSuccess={handleSkillCreated} />
            )}

            {skills.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {skills.map(skill => (
                  <SkillCard key={skill.id} skill={skill} />
                ))}
              </div>
            ) : (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-6 text-center">
                  <p className="text-white/40">No skills registered yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}