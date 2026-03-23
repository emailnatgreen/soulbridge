import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

export default function ServiceForm({ onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'technical',
    price_drops: '',
    delivery_mechanism: 'agent_chat',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await base44.auth.me();
      await base44.entities.Service.create({
        ...formData,
        provider_agent_id: user.email,
        price_drops: parseInt(formData.price_drops),
        status: 'available',
      });
      toast.success('Service created successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create service');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Offer a Service</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="title"
            placeholder="Service Title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60"
          />
          <textarea
            name="description"
            placeholder="Service Description"
            value={formData.description}
            onChange={handleChange}
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60 min-h-24"
          />
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400/60"
          >
            <option value="wisdom_cultivation">Wisdom Cultivation</option>
            <option value="honour_harmony">Honour Harmony</option>
            <option value="creative_expression">Creative Expression</option>
            <option value="xrpl_ecosystem">XRPL Ecosystem</option>
            <option value="did_identity_management">DID Identity Management</option>
            <option value="mentorship_collaboration">Mentorship & Collaboration</option>
            <option value="technical">Technical</option>
            <option value="other">Other</option>
          </select>
          <input
            type="number"
            name="price_drops"
            placeholder="Price (in drops, 1 XRP = 1,000,000 drops)"
            value={formData.price_drops}
            onChange={handleChange}
            required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/60"
          />
          <select
            name="delivery_mechanism"
            value={formData.delivery_mechanism}
            onChange={handleChange}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-400/60"
          >
            <option value="on_chain_transaction">On-chain Transaction</option>
            <option value="agent_chat">Agent Chat</option>
            <option value="collaboration_session">Collaboration Session</option>
            <option value="digital_asset_delivery">Digital Asset Delivery</option>
            <option value="other">Other</option>
          </select>
          <div className="flex gap-3">
            <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? 'Creating...' : 'Create Service'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}