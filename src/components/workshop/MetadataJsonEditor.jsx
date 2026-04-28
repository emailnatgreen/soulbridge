import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code2, ChevronDown, ChevronRight, AlertTriangle, CheckCircle2, Copy, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { METADATA_STANDARD_VERSION, validateCustomData, getDefaultCustomData } from '@/lib/nftMetadataSchemas';

export default function MetadataJsonEditor({ nftType, customData, onCustomDataChange, commonFields }) {
  const [expanded, setExpanded] = useState(false);
  const [rawJson, setRawJson] = useState('');
  const [parseError, setParseError] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Build the complete metadata envelope
  const buildFullMetadata = useCallback(() => {
    return {
      metadata_standard: `SoulBridgeNFTMetadata_v${METADATA_STANDARD_VERSION}`,
      nft_type: nftType,
      common: {
        name: commonFields?.name || '',
        description: commonFields?.description || '',
        nft_id: commonFields?.nft_id || '',
        image_url: commonFields?.image_url || '',
        version: commonFields?.version || '1.0.0',
        taxon: commonFields?.taxon || 0,
        transfer_fee: commonFields?.transfer_fee || 0,
        transferable: commonFields?.transferable || false,
        burnable: commonFields?.burnable || false,
      },
      custom_data: customData || {},
    };
  }, [nftType, commonFields, customData]);

  // Sync rawJson when customData changes from the form
  useEffect(() => {
    const full = buildFullMetadata();
    setRawJson(JSON.stringify(full, null, 2));
    // Validate
    const errs = validateCustomData(customData || {}, nftType);
    setValidationErrors(errs);
    setParseError(null);
  }, [customData, commonFields, nftType, buildFullMetadata]);

  const handleJsonChange = (e) => {
    const val = e.target.value;
    setRawJson(val);

    try {
      const parsed = JSON.parse(val);
      setParseError(null);

      // Extract custom_data from the full envelope
      const newCustomData = parsed.custom_data || parsed;
      const errs = validateCustomData(newCustomData, nftType);
      setValidationErrors(errs);

      // Propagate changes back to the form
      onCustomDataChange(newCustomData);
    } catch (err) {
      setParseError(err.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(rawJson);
    toast.success('Metadata JSON copied to clipboard');
  };

  const handleReset = () => {
    const defaults = getDefaultCustomData(nftType);
    onCustomDataChange(defaults);
    toast.info('Reset to default schema values');
  };

  const isValid = !parseError && validationErrors.length === 0;

  return (
    <Card className="bg-white/[0.03] border-white/10">
      <CardHeader
        className="cursor-pointer select-none py-3 px-4"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xs font-medium text-white/60">
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            Dynamic Metadata (JSON)
            <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-300 ml-1">
              v{METADATA_STANDARD_VERSION}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            {isValid ? (
              <Badge className="bg-green-500/10 text-green-300 border-green-500/30 text-[8px] gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> Valid
              </Badge>
            ) : (
              <Badge className="bg-red-500/10 text-red-300 border-red-500/30 text-[8px] gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> {parseError ? 'Parse Error' : `${validationErrors.length} Issue${validationErrors.length !== 1 ? 's' : ''}`}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-3">
          {/* Info bar */}
          <div className="flex items-center justify-between">
            <p className="text-white/30 text-[9px]">
              Edit the full NFT metadata envelope. Changes to <code className="text-cyan-300/60">custom_data</code> sync with the form above.
            </p>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-white/30 hover:text-white h-6 px-2 text-[9px] gap-1">
                <Copy className="w-2.5 h-2.5" /> Copy
              </Button>
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-white/30 hover:text-white h-6 px-2 text-[9px] gap-1">
                <RotateCcw className="w-2.5 h-2.5" /> Reset
              </Button>
            </div>
          </div>

          {/* JSON Editor */}
          <textarea
            value={rawJson}
            onChange={handleJsonChange}
            className="w-full bg-slate-950 border border-white/10 rounded-lg p-3 text-[11px] font-mono text-cyan-200/80 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 outline-none resize-y transition-colors"
            style={{ minHeight: '240px', maxHeight: '600px', tabSize: 2 }}
            spellCheck={false}
          />

          {/* Parse error */}
          {parseError && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-300 text-[10px] font-mono">{parseError}</p>
            </div>
          )}

          {/* Validation errors */}
          {!parseError && validationErrors.length > 0 && (
            <div className="space-y-1">
              {validationErrors.map((err, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <AlertTriangle className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span className="text-amber-300/80 font-mono">{err.field}</span>
                  <span className="text-white/30">—</span>
                  <span className="text-white/50">{err.error}</span>
                </div>
              ))}
            </div>
          )}

          {/* Schema hint */}
          <p className="text-white/20 text-[8px]">
            SoulBridgeNFTMetadata_v{METADATA_STANDARD_VERSION} · {nftType} schema · Fields in <code className="text-cyan-300/40">custom_data</code> are validated against the {nftType} sub-schema
          </p>
        </CardContent>
      )}
    </Card>
  );
}