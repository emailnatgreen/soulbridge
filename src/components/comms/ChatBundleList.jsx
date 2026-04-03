import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Archive, Clock, Users, MessageCircle, Trash2 } from 'lucide-react';

export default function ChatBundleList({ bundles = [], agents = [], onLoad, onDelete }) {
  if (bundles.length === 0) {
    return (
      <div className="text-center py-8">
        <Archive className="w-8 h-8 text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">No saved bundles yet</p>
        <p className="text-white/30 text-xs mt-1">Chat sessions will appear here when saved</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] lg:h-[400px]">
      <div className="space-y-2 pr-2">
        {bundles.map(bundle => {
          const participantNames = (bundle.participant_ids || [])
            .map(id => agents.find(a => a.id === id)?.name || 'Unknown')
            .join(', ');

          return (
            <div
              key={bundle.id}
              className="p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <h4 className="text-white text-sm font-medium truncate flex-1">{bundle.title || 'Untitled Bundle'}</h4>
                <Badge className="bg-purple-500/20 text-purple-300 text-[10px] flex-shrink-0">
                  {bundle.message_count || 0} msgs
                </Badge>
              </div>
              {participantNames && (
                <div className="flex items-center gap-1 mb-1.5">
                  <Users className="w-3 h-3 text-white/30" />
                  <span className="text-[10px] text-white/40 truncate">{participantNames}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-[10px] text-white/30 mb-2">
                <Clock className="w-3 h-3" />
                {bundle.created_date ? new Date(bundle.created_date).toLocaleString() : 'Unknown'}
              </div>
              {bundle.summary && (
                <p className="text-[10px] text-white/50 line-clamp-2 mb-2">{bundle.summary}</p>
              )}
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onLoad(bundle)}
                  className="text-purple-300 hover:bg-purple-500/10 text-xs h-7 flex-1"
                >
                  <MessageCircle className="w-3 h-3 mr-1" /> Load
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(bundle.id)}
                  className="text-red-300 hover:bg-red-500/10 text-xs h-7"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}