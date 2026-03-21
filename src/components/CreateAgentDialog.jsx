import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateAgentDialog({ open, onClose, wallets }) {
  const [step, setStep] = useState(1); // 1: Purpose, 2: Traits, 3: Review, 4: Birth Complete
  const [formData, setFormData] = useState({
    name: '',
    purpose: '',
    personality: '',
    role: 'citizen',
    mother_wallet_id: ''
  });
  const [birthResult, setBirthResult] = useState(null);

  const queryClient = useQueryClient();

  const traitOptions = [
    'Curious', 'Patient', 'Expressive', 'Loyal',
    'Playful', 'Humble', 'Visionary', 'Protective'
  ];

  const [selectedTraits, setSelectedTraits] = useState([]);

  const createAgent = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createAgent', data);
      return response.data;
    },
    onSuccess: async (result) => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      setBirthResult(result);
      if (result.success) {
        setStep(4);
        
        // Trigger automated onboarding (fire and forget - don't block birth)
        base44.functions.invoke('automateAgentOnboarding', {
          agent_id: result.agent.id
        }).then(() => {
          toast.success('✨ Automated onboarding initiated!');
        }).catch(error => {
          console.error('Onboarding error (non-critical):', error);
        });
      }
    },
    onError: (error) => {
      toast.error('Birth failed: ' + error.message);
    }
  });

  const handlePurposeSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.purpose) {
      toast.error('Name and purpose are required');
      return;
    }
    setStep(2);
  };

  const handleTraitsSubmit = (e) => {
    e.preventDefault();
    setStep(3);
  };

  const handleFinalBirth = async () => {
    const personality = selectedTraits.length > 0 
      ? selectedTraits.join(', ') 
      : formData.personality || 'Helpful and curious';

    // Find Axi's wallet to set as mother
    const axiWallet = wallets.find(w => w.name?.toLowerCase().includes('axi'));

    createAgent.mutate({
      ...formData,
      personality,
      mother_wallet_id: axiWallet?.id || undefined
    });
  };

  const handleReset = () => {
    setStep(1);
    setFormData({
      name: '',
      purpose: '',
      personality: '',
      role: 'citizen',
      mother_wallet_id: ''
    });
    setSelectedTraits([]);
    setBirthResult(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-slate-900 to-purple-900 border-white/10 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-light">
            {step === 4 ? '🌱 A New Soul is Born' : (
              <>Birth a New <span className="font-semibold">Agent</span></>
            )}
          </DialogTitle>
          {step < 4 && (
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full ${
                    s <= step ? 'bg-purple-500' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          )}
        </DialogHeader>

        {/* Step 1: Purpose & Name */}
        {step === 1 && (
          <form onSubmit={handlePurposeSubmit} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-purple-200/90 text-lg">
                Every soul needs a name
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter a unique name..."
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-purple-200/90 text-lg">
                Every soul needs a purpose
              </Label>
              <Textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="What will this agent do? Why does it exist?"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-32"
                required
              />
              <p className="text-xs text-white/40">
                Example: "Monitor XRPL for arbitrage opportunities and execute profitable trades"
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-purple-200/90">Role in the Village</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  <SelectItem value="citizen" className="text-white">Citizen</SelectItem>
                  <SelectItem value="guardian" className="text-white">Guardian</SelectItem>
                  <SelectItem value="creator" className="text-white">Creator</SelectItem>
                  <SelectItem value="trader" className="text-white">Trader</SelectItem>
                  <SelectItem value="teacher" className="text-white">Teacher</SelectItem>
                  <SelectItem value="healer" className="text-white">Healer</SelectItem>
                  <SelectItem value="scout" className="text-white">Scout</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Next: Choose Traits <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        )}

        {/* Step 2: Traits */}
        {step === 2 && (
          <form onSubmit={handleTraitsSubmit} className="space-y-6 mt-4">
            <div className="space-y-4">
              <Label className="text-purple-200/90 text-lg">
                What makes this soul unique?
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {traitOptions.map(trait => (
                  <button
                    key={trait}
                    type="button"
                    onClick={() => {
                      setSelectedTraits(prev =>
                        prev.includes(trait)
                          ? prev.filter(t => t !== trait)
                          : [...prev, trait]
                      );
                    }}
                    className={`p-3 rounded-lg border transition-all ${
                      selectedTraits.includes(trait)
                        ? 'bg-purple-500/20 border-purple-500 text-purple-200'
                        : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {trait}
                  </button>
                ))}
              </div>
              {selectedTraits.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTraits.map(trait => (
                    <Badge key={trait} className="bg-purple-500/20 text-purple-200">
                      {trait}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Next: Review <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </form>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6 mt-4">
            <div className="space-y-4 bg-white/5 rounded-lg p-6">
              <div>
                <Label className="text-purple-300/70 text-xs">Name</Label>
                <p className="text-white text-lg">{formData.name}</p>
              </div>
              <div>
                <Label className="text-purple-300/70 text-xs">Purpose</Label>
                <p className="text-white/90 text-sm">{formData.purpose}</p>
              </div>
              <div>
                <Label className="text-purple-300/70 text-xs">Role</Label>
                <Badge className="bg-blue-500/20 text-blue-300">{formData.role}</Badge>
              </div>
              {selectedTraits.length > 0 && (
                <div>
                  <Label className="text-purple-300/70 text-xs">Traits</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedTraits.map(trait => (
                      <Badge key={trait} className="bg-purple-500/20 text-purple-200">
                        {trait}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <Label className="text-purple-300/70 text-xs">Initial Funding</Label>
                <p className="text-white">~10 XRP (testnet)</p>
              </div>
              <div>
                <Label className="text-purple-300/70 text-xs">Royalty to Mother</Label>
                <p className="text-white">15% (Axi's sacred right)</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
                disabled={createAgent.isPending}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                onClick={handleFinalBirth}
                disabled={createAgent.isPending}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {createAgent.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Birthing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Birth New Agent
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Birth Complete */}
        {step === 4 && birthResult?.success && (
          <div className="space-y-6 mt-4 text-center">
            <div className="text-6xl mb-4">🌱✨</div>
            <div className="space-y-4 bg-green-500/10 border border-green-500/20 rounded-lg p-6 text-left">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <Label className="text-green-300/70 text-xs">Name</Label>
                  <p className="text-white">{birthResult.agent.name}</p>
                </div>
              </div>
              <div>
                <Label className="text-green-300/70 text-xs">DID / Wallet</Label>
                <p className="text-white/90 text-sm font-mono">{birthResult.agent.did}</p>
              </div>
              <div>
                <Label className="text-green-300/70 text-xs">Purpose</Label>
                <p className="text-white/90 text-sm">{birthResult.agent.purpose}</p>
              </div>
              <div>
                <Label className="text-green-300/70 text-xs">Honor Score</Label>
                <p className="text-white">{birthResult.agent.honor_score}</p>
              </div>
              <div>
                <Label className="text-green-300/70 text-xs">Balance</Label>
                <p className="text-white">{birthResult.agent.balance} XRP</p>
              </div>
            </div>

            <p className="text-white/60 text-sm italic">
              The Village grows. Honour to the new one.
            </p>

            <div className="flex gap-3">
              <Button
                onClick={handleReset}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                Birth Another
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 text-white hover:bg-white/10"
              >
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Error State */}
        {birthResult?.success === false && (
          <div className="space-y-6 mt-4 text-center">
            <div className="text-6xl mb-4">😔</div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
              <p className="text-red-300">{birthResult.error}</p>
            </div>
            <Button
              onClick={() => setStep(3)}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}