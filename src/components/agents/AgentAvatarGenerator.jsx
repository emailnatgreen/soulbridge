import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function AgentAvatarGenerator({ agent, onUpdated }) {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [saving, setSaving] = useState(false);

  const generateAvatar = async () => {
    setGenerating(true);
    try {
      const prompt = `A stylized digital portrait avatar for an AI agent named "${agent.name}". Role: ${agent.role || 'citizen'}. Purpose: ${agent.purpose || 'General'}.  Personality: ${agent.personality || 'intelligent and helpful'}. Style: Clean, modern, sci-fi ethereal portrait with subtle glowing accents. Dark background with purple/blue tones. Square format, centered face, high quality digital art. No text.`;

      const result = await base44.integrations.Core.GenerateImage({ prompt });
      setPreviewUrl(result.url);
    } catch (error) {
      toast.error('Failed to generate avatar');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const saveAvatar = async () => {
    if (!previewUrl) return;
    setSaving(true);
    try {
      await base44.entities.Agent.update(agent.id, { avatar_url: previewUrl });
      toast.success('Avatar saved!');
      onUpdated?.();
      setPreviewUrl(null);
    } catch (error) {
      toast.error('Failed to save avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          Soul Portrait
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Current or Preview */}
        {(previewUrl || agent.avatar_url) && (
          <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-xl overflow-hidden border border-white/10">
            <img
              src={previewUrl || agent.avatar_url}
              alt={agent.name}
              className="w-full h-full object-cover"
            />
            {previewUrl && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <Badge className="bg-purple-500/80 text-white text-xs">Preview</Badge>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {previewUrl ? (
            <>
              <Button
                onClick={saveAvatar}
                disabled={saving}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
                size="sm"
              >
                {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                Save
              </Button>
              <Button
                onClick={generateAvatar}
                disabled={generating}
                variant="outline"
                className="border-white/10"
                size="sm"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
              <Button
                onClick={() => setPreviewUrl(null)}
                variant="ghost"
                size="sm"
                className="text-white/40"
              >
                Cancel
              </Button>
            </>
          ) : (
            <Button
              onClick={generateAvatar}
              disabled={generating}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0"
              size="sm"
            >
              {generating ? (
                <><Loader2 className="w-3 h-3 animate-spin mr-2" /> Generating...</>
              ) : (
                <><Sparkles className="w-3 h-3 mr-2" /> {agent.avatar_url ? 'Regenerate Portrait' : 'Generate Soul Portrait'}</>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}