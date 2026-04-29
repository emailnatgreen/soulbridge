import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Archive, Clock, Users, MessageCircle, Trash2, RotateCcw } from 'lucide-react';

export default function ChatBundleList({ bundles = [], agents = [], onLoad, onDelete }) {
  // Parse bundle content to extract metadata
  const parsedBundles = bundles.map(bundle => {
    let data = {};
    try { data = JSON.parse(bundle.content); } catch (_) {}
    return { ...bundle, _data: data };
  });

  if (parsedBundles.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Archive className="w-6 h-6 text-white/15" />
        </div>
        <p className="text-white/40 text-sm font-medium">No saved conversations</p>
        <p className="text-white/20 text-xs mt-1 max-w-[200px] mx-auto">
          Conversations you save will appear here for quick access
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-340px)]">
      <div className="space-y-2 pr-1">
        {parsedBundles.map(bundle => {
          const data = bundle._data;
          const participantNames = (data.participant_ids || [])
            .map(id => agents.find(a => a.id === id)?.name || 'Unknown')
            .filter(Boolean);
          const messageCount = data.message_count || 0;
          const date = bundle.created_date ? new Date(bundle.created_date) : null;

          return (
            <div
              key={bundle.id}
              className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/10 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-white text-xs font-medium truncate flex-1 leading-snug">
                  {bundle.context || data.title || 'Untitled'}
                </h4>
                <Badge className="bg-purple-500/15 text-purple-300/70 border-0 text-[9px] flex-shrink-0 px-1.5">
                  {messageCount} msgs
                </Badge>
              </div>

              {participantNames.length > 0 && (
                <div className="flex items-center gap-1 mb-2">
                  <Users className="w-3 h-3 text-white/20 flex-shrink-0" />
                  <span className="text-[10px] text-white/30 truncate">{participantNames.join(', ')}</span>
                </div>
              )}

              {data.summary && (
                <p className="text-[10px] text-white/25 line-clamp-2 mb-2 italic">{data.summary}</p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-[10px] text-white/20">
                  <Clock className="w-3 h-3" />
                  {date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoad(bundle)}
                    className="text-purple-300 hover:bg-purple-500/10 text-[10px] h-6 gap-1 px-2"
                  >
                    <RotateCcw className="w-3 h-3" /> Load
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(bundle.id)}
                    className="text-red-400/60 hover:bg-red-500/10 hover:text-red-300 text-[10px] h-6 w-6 p-0"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}