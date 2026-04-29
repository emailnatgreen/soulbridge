import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Download, Copy, FileJson, CheckCircle2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Generates a WebMCP 2026.1 manifest from Chrome Skill definitions.
 * This is the file that Chrome's Gemini Side Panel uses to discover and execute skills.
 */
function buildWebMCPManifest({ name, nftId, description, skills, imageUrl }) {
  return {
    version: '2026.1',
    name: name || 'Unnamed Chrome Skill',
    description: description || '',
    nft_id: nftId || undefined,
    icon: imageUrl || undefined,
    capabilities: {
      tools: skills
        .filter(s => s.skill_name && s.instructions)
        .map(s => ({
          name: s.skill_name.replace(/\s+/g, '_').toLowerCase(),
          display_name: s.skill_name,
          description: `Trigger: ${s.trigger_command || 'manual'} — ${s.instructions.slice(0, 120)}${s.instructions.length > 120 ? '…' : ''}`,
          trigger_command: s.trigger_command || undefined,
          requires_verification: s.requires_didit_verification ?? true,
          parameters: {
            type: 'object',
            properties: {
              user_context: {
                type: 'string',
                description: 'Optional user context or parameters for this skill execution',
              },
            },
          },
          instructions: s.instructions,
        })),
    },
  };
}

function buildChromeSkillInstructions(skills) {
  return skills
    .filter(s => s.skill_name && s.instructions)
    .map(s => ({
      skill_name: s.skill_name,
      instructions: s.instructions,
      trigger_command: s.trigger_command || undefined,
      requires_didit_verification: s.requires_didit_verification ?? true,
    }));
}

export default function ChromeManifestExport({ name, nftId, description, skills, imageUrl }) {
  const [showPreview, setShowPreview] = useState(false);

  const validSkills = skills.filter(s => s.skill_name && s.instructions);
  const hasValidSkills = validSkills.length > 0;

  const manifest = buildWebMCPManifest({ name, nftId, description, skills, imageUrl });
  const manifestJson = JSON.stringify(manifest, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(manifestJson);
    toast.success('WebMCP manifest copied to clipboard');
  };

  const handleDownload = () => {
    const blob = new Blob([manifestJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(nftId || name || 'chrome-skill').replace(/\s+/g, '-').toLowerCase()}-webmcp-manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Manifest downloaded');
  };

  return (
    <Card className="bg-cyan-500/[0.03] border-cyan-500/20">
      <CardContent className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-xs font-semibold">WebMCP Manifest</span>
            <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-cyan-300">v2026.1</Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {hasValidSkills ? (
              <Badge className="bg-green-500/10 text-green-300 border-green-500/30 text-[8px] gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> {validSkills.length} skill{validSkills.length !== 1 ? 's' : ''} ready
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[8px] gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> No valid skills yet
              </Badge>
            )}
          </div>
        </div>

        <p className="text-white/30 text-[9px] leading-relaxed">
          This manifest is auto-generated from your skill definitions above. Download it and host it alongside your NFT metadata for Chrome discovery. When a WebMCP-compatible browser detects this NFT, it will load these skills into the Gemini Side Panel.
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={!hasValidSkills}
            className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 gap-1.5 text-[10px] h-7"
          >
            <Download className="w-3 h-3" /> Download .json
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!hasValidSkills}
            className="text-white/30 hover:text-white gap-1.5 text-[10px] h-7"
          >
            <Copy className="w-3 h-3" /> Copy
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="text-white/30 hover:text-white gap-1.5 text-[10px] h-7 ml-auto"
          >
            {showPreview ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
        </div>

        {showPreview && (
          <pre className="bg-slate-950 border border-white/10 rounded-lg p-3 text-[10px] font-mono text-cyan-200/70 overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap">
            {manifestJson}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}