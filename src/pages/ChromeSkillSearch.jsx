import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, Sparkles, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useIdentity } from '@/hooks/useIdentity';
import EngineSelector from '@/components/chrome-search/EngineSelector';
import EngineVisualState from '@/components/chrome-search/EngineVisualState';
import SearchResultCard from '@/components/chrome-search/SearchResultCard';
import EarthBlockCard from '@/components/chrome-search/EarthBlockCard';
import ShieldLogBanner from '@/components/chrome-search/ShieldLogBanner';
import SearchErrorCard from '@/components/chrome-search/SearchErrorCard';

export default function ChromeSkillSearch() {
  const { user, isRecognized } = useIdentity();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResponse, setSearchResponse] = useState(null);
  const [searchError, setSearchError] = useState(null);
  const [selectedEngine, setSelectedEngine] = useState(null);
  const [showEnginePanel, setShowEnginePanel] = useState(false);
  const inputRef = useRef(null);

  // Fetch user's ES-NFTs
  const { data: engines = [], isLoading: enginesLoading } = useQuery({
    queryKey: ['user-es-nfts'],
    queryFn: () => base44.entities.SearchEngineNFT.filter({ status: 'active' }),
    enabled: isRecognized,
  });

  // Auto-select first engine
  useEffect(() => {
    if (engines.length > 0 && !selectedEngine) {
      setSelectedEngine(engines[0]);
    }
  }, [engines, selectedEngine]);

  // Resolve user's DID from wallets
  const { data: wallets = [] } = useQuery({
    queryKey: ['user-wallets-for-search'],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user?.id }),
    enabled: !!user?.id,
  });

  const userDid = selectedEngine?.owner_did || wallets?.[0]?.classic_address || '';

  const handleSearch = async () => {
    if (!query.trim() || !selectedEngine || searching) return;

    setSearching(true);
    setSearchResponse(null);
    setSearchError(null);

    const response = await base44.functions.invoke('searchEngineContractV1', {
      query: query.trim(),
      user_did: userDid,
      engine_did: selectedEngine.token_id,
      options: { locale: 'en', output_mode: 'inline' },
    });

    setSearching(false);

    if (response.status >= 400) {
      setSearchError({ status: response.status, message: response.data?.error || response.data?.detail });
      return;
    }

    setSearchResponse(response.data);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  // Derived state from response
  const isEarthBlocked = searchResponse?.safety_flags?.includes('EARTH_BLOCKED_QUERY');
  const result = searchResponse?.results?.[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            {selectedEngine && <EngineVisualState nft={selectedEngine} size="md" />}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            Sovereign Search
          </h1>
          <p className="text-sm text-slate-400">
            Meaning-filtered · Honour-ranked · Safety-gated
          </p>
        </div>

        {/* Engine toggle */}
        {engines.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowEnginePanel(!showEnginePanel)}
              className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${showEnginePanel ? 'rotate-90' : ''}`} />
              {selectedEngine ? `Engine: ${selectedEngine.token_id}` : 'Select Engine'}
            </button>
            <AnimatePresence>
              {showEnginePanel && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-2"
                >
                  <EngineSelector
                    engines={engines}
                    selectedEngine={selectedEngine}
                    onSelect={(nft) => {
                      setSelectedEngine(nft);
                      setShowEnginePanel(false);
                    }}
                    loading={enginesLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Search bar */}
        <div className="relative mb-6">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                ref={inputRef}
                placeholder={selectedEngine ? "Ask with meaning..." : "Select an engine first..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!selectedEngine || searching}
                className="pl-10 bg-slate-900/60 border-slate-700/50 text-white placeholder:text-slate-500 h-12 rounded-xl focus:border-teal-500/50 focus:ring-teal-500/20"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!query.trim() || !selectedEngine || searching}
              className="h-12 px-6 bg-teal-600 hover:bg-teal-500 text-white rounded-xl shrink-0"
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </Button>
          </div>
          {!selectedEngine && !enginesLoading && engines.length === 0 && isRecognized && (
            <p className="text-xs text-amber-400/80 mt-2">
              You need a Search Engine NFT (ES-NFT) to use the sovereign search engine.
            </p>
          )}
        </div>

        {/* Loading state */}
        <AnimatePresence>
          {searching && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 py-12"
            >
              <div className="relative">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-teal-400/20 animate-ping" />
              </div>
              <p className="text-sm text-slate-400">Processing through 7-Leaf pipeline...</p>
              <div className="flex gap-1 mt-1">
                {['Cosmology','Purpose','Earth','Practice','Language','Collective','Regeneration'].map((leaf, i) => (
                  <motion.span
                    key={leaf}
                    className="text-[9px] text-slate-600 px-1.5 py-0.5 rounded bg-slate-800/50"
                    animate={{ color: ['#475569', '#5eead4', '#475569'] }}
                    transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
                  >
                    {leaf}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error state */}
        {searchError && (
          <div className="mb-4">
            <SearchErrorCard status={searchError.status} errorMessage={searchError.message} />
          </div>
        )}

        {/* Results */}
        {searchResponse && !searching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Earth block */}
            {isEarthBlocked ? (
              <EarthBlockCard
                blockReason={searchResponse.results?.[0]?.structured_result}
                honourDelta={searchResponse.honour_delta}
              />
            ) : result ? (
              <SearchResultCard
                result={result}
                meta={searchResponse.meta}
                safetyFlags={searchResponse.safety_flags}
                outcomeStatus={searchResponse.outcome_status}
              />
            ) : null}

            {/* Shield log transparency */}
            <ShieldLogBanner
              shieldEntryId={searchResponse.shield_entry_id}
              searchId={searchResponse.meta?.search_id}
            />

            {/* Meta footer */}
            {searchResponse.meta && (
              <div className="flex flex-wrap gap-3 text-[10px] text-slate-600 pt-2">
                <span>Processing: {searchResponse.meta.processing_ms}ms</span>
                <span>Searches today: {searchResponse.meta.searches_today}</span>
                <span>Cost: {searchResponse.meta.cost_rlusd} RLUSD</span>
                {searchResponse.honour_delta !== 0 && (
                  <span className={searchResponse.honour_delta > 0 ? 'text-emerald-500' : 'text-red-400'}>
                    Honour Δ: {searchResponse.honour_delta > 0 ? '+' : ''}{searchResponse.honour_delta}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Empty state */}
        {!searching && !searchResponse && !searchError && selectedEngine && (
          <div className="text-center py-16">
            <Search className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Ask a question to begin a meaning-filtered search.</p>
            <p className="text-xs text-slate-600 mt-1">Results are ranked by honour, safety, and alignment.</p>
          </div>
        )}
      </div>
    </div>
  );
}