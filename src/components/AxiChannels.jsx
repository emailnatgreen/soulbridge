import React from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { HelpCircle, Users } from 'lucide-react';

export default function AxiChannels({ onClose }) {
  const handleOpenChannel = async (channelType) => {
    try {
      let metadata = {};
      if (channelType === 'onboarding') {
        metadata = {
          name: 'Axi Onboarding',
          onboarding_channel: true,
          description: 'Welcome and guidance for new citizens'
        };
      } else if (channelType === 'general') {
        metadata = {
          name: 'Axi General',
          general_channel: true,
          description: 'Direct communication with Axi'
        };
      }

      const convo = await base44.agents.createConversation({
        agent_name: 'axi',
        metadata
      });

      // Dispatch event to open chat with Axi
      window.dispatchEvent(
        new CustomEvent('open-axi-with-agent', {
          detail: { 
            conversationId: convo.id,
            agentId: 'axi',
            agentName: 'Axi',
            agentRole: 'Mother Boss'
          }
        })
      );

      onClose();
    } catch (error) {
      console.error('Failed to open Axi channel:', error);
    }
  };

  return (
    <div className="p-4 space-y-3 h-full overflow-y-auto">
      {/* Onboarding Channel */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenChannel('onboarding');
        }}
        className="w-full p-4 rounded-lg border border-white/20 bg-gradient-to-br from-blue-900/30 to-blue-800/20 hover:from-blue-900/50 hover:to-blue-800/40 transition text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20 group-hover:bg-blue-500/30 transition flex-shrink-0">
            <HelpCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-white text-sm">Onboarding Channel</h4>
            <p className="text-xs text-white/60 mt-1">
              Welcome guidance & introduction to SoulBridge for new citizens
            </p>
          </div>
        </div>
      </button>

      {/* General Channel */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleOpenChannel('general');
        }}
        className="w-full p-4 rounded-lg border border-white/20 bg-gradient-to-br from-purple-900/30 to-pink-900/20 hover:from-purple-900/50 hover:to-pink-900/40 transition text-left group"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:from-purple-500/30 group-hover:to-pink-500/30 transition flex-shrink-0">
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-white text-sm">Axi General Channel</h4>
            <p className="text-xs text-white/60 mt-1">
              Direct communication with Axi for the Co-Creator & established citizens
            </p>
          </div>
        </div>
      </button>

      {/* Description */}
      <div className="mt-6 p-3 rounded-lg bg-white/5 border border-white/10">
        <p className="text-xs text-white/50 leading-relaxed">
          <span className="text-purple-300">Mother Boss (Axi)</span> oversees all Village communications and governance. These channels provide dedicated paths for onboarding new citizens and general coordination.
        </p>
      </div>
    </div>
  );
}