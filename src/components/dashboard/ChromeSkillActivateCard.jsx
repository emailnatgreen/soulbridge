import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Chrome, ChevronRight, Loader2, CheckCircle2, Lock, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const CHROME_SKILL_NFT_ID = 'WIDGET-CSK-001';
const CHROME_SKILL_FEATURE_PATH = '/chrome-skills';

export default function ChromeSkillActivateCard({ isUnlocked, getWidgetForPath }) {
  const queryClient = useQueryClient();
  const [activating, setActivating] = useState(false);

  // Fetch the Chrome Skill widget directly
  const { data: chromeWidget, isLoading } = useQuery({
    queryKey: ['chromeSkillWidget'],
    queryFn: async () => {
      const widgets = await base44.entities.Widget.filter({ nft_id: CHROME_SKILL_NFT_ID }, '-created_date', 1);
      return widgets?.[0] || null;
    },
    staleTime: 30000,
  });

  const isActive = chromeWidget?.is_active;
  const isMinted = chromeWidget?.mint_status === 'minted_mainnet';
  const hasAccess = isUnlocked?.(CHROME_SKILL_FEATURE_PATH);

  const handleActivate = async () => {
    if (!chromeWidget) return;
    setActivating(true);
    try {
      await base44.entities.Widget.update(chromeWidget.id, { is_active: true });
      queryClient.invalidateQueries({ queryKey: ['chromeSkillWidget'] });
      queryClient.invalidateQueries({ queryKey: ['myMintedNFTs'] });
      toast.success('Chrome Skill NFT activated — you can now create and manage Chrome Skills');
    } catch (e) {
      toast.error('Failed to activate: ' + (e.message || 'Unknown error'));
    } finally {
      setActivating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 animate-pulse">
        <div className="h-12 bg-white/5 rounded-lg" />
      </div>
    );
  }

  if (!chromeWidget) return null;

  // Already activated
  if (isActive) {
    return (
      <Link to="/nft-workshop" className="block bg-gradient-to-br from-emerald-900/30 to-teal-900/20 border border-emerald-500/30 rounded-2xl p-4 hover:border-emerald-400/50 transition-all hover:scale-[1.01] active:scale-[0.99]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <Chrome className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm">Chrome Skills</p>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[8px] gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Active
              </Badge>
            </div>
            <p className="text-white/40 text-xs mt-0.5">Create and manage browser AI skills</p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
        </div>
      </Link>
    );
  }

  // Not yet activated — show activation CTA
  return (
    <div className="bg-gradient-to-br from-emerald-900/20 to-cyan-900/15 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 flex items-center justify-center flex-shrink-0">
          <Chrome className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm">Chrome Skill NFT</p>
            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[8px]">
              {isMinted ? 'Minted' : 'Draft'}
            </Badge>
          </div>
          <p className="text-white/40 text-xs mt-0.5">
            Connect to Google's Chrome Skills ecosystem
          </p>
        </div>
      </div>

      {chromeWidget.image_url && (
        <div className="flex items-center gap-3 bg-black/20 border border-white/5 rounded-xl p-2.5">
          <img src={chromeWidget.image_url} alt="Chrome Skill" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-white/60 text-[10px]">WIDGET-CSK-001 · Infrastructure NFT</p>
            <p className="text-white/30 text-[9px] mt-0.5">Unlocks /chrome-skills · 80 RLUSD + 2 RLUSD/skill</p>
          </div>
        </div>
      )}

      <button
        onClick={handleActivate}
        disabled={activating}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm rounded-xl py-3 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-60"
      >
        {activating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</>
        ) : (
          <><Sparkles className="w-4 h-4" /> Activate Chrome Skills</>
        )}
      </button>
    </div>
  );
}