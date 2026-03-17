import React, { useEffect, useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquare, Send, Bell, Zap, RefreshCw, Users, CheckCircle,
  Circle, Loader2, ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

const AXI_ID = 'axi_main_001';
const axiIds = ['axi_main_001', 'Axi', 'axi'];

export default function AgentInbox() {
  const queryClient = useQueryClient();
  const [newMessages, setNewMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [toAgentId, setToAgentId] = useState(AXI_ID);
  const [composeText, setComposeText] = useState('');
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [pulse, setPulse] = useState(false);
  const audioRef = useRef(null);

  // Fetch agents for compose dropdown
  const { data: agents = [] } = useQuery({
    queryKey: ['agents-inbox'],
    queryFn: () => base44.entities.Agent.list(),
  });

  // Fetch recent agent messages (all)
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: ['agent-messages-inbox'],
    queryFn: () => base44.entities.AgentMessage.list('-created_date', 50),
  });

  // Fetch unread notifications for Axi
  const { data: axiNotifs = [], refetch: refetchNotifs } = useQuery({
    queryKey: ['axi-notifs-inbox'],
    queryFn: () => base44.entities.AgentNotification.filter(
      { notification_type: 'message', recipient_agent_id: AXI_ID },
      '-created_date', 30
    ),
  });

  // === REAL-TIME SUBSCRIPTION ===
  useEffect(() => {
    // Subscribe to new AgentMessage records in real-time
    const unsubscribeMessages = base44.entities.AgentMessage.subscribe((event) => {
      if (event.type === 'create') {
        const msg = event.data;
        setNewMessages(prev => [msg, ...prev].slice(0, 50));
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
        // Invalidate query so list refreshes
        queryClient.invalidateQueries({ queryKey: ['agent-messages-inbox'] });
      } else if (event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['agent-messages-inbox'] });
      }
    });

    // Subscribe to AgentNotification in real-time (Axi's incoming feed)
    const unsubscribeNotifs = base44.entities.AgentNotification.subscribe((event) => {
      if (event.type === 'create' && event.data?.notification_type === 'agent_message') {
        setLiveNotifications(prev => [event.data, ...prev].slice(0, 20));
        setPulse(true);
        setTimeout(() => setPulse(false), 2000);
        queryClient.invalidateQueries({ queryKey: ['axi-notifs-inbox'] });
      }
    });

    return () => {
      unsubscribeMessages();
      unsubscribeNotifs();
    };
  }, [queryClient]);

  // Send a message from user to any agent
  const handleSend = async () => {
    if (!composeText.trim() || !toAgentId) return;
    setSending(true);
    try {
      await base44.entities.AgentMessage.create({
        sender_agent_id: 'Governor (Nathan)',
        to_agent_id: toAgentId,
        content: composeText.trim(),
        message_type: 'text',
        status: 'sent',
        read_by: [],
        metadata: {
          from_agent_name: 'Governor Nathan',
          to_agent_name: agents.find(a => a.id === toAgentId)?.name || toAgentId,
          sent_at: new Date().toISOString(),
        }
      });
      setComposeText('');
      queryClient.invalidateQueries({ queryKey: ['agent-messages-inbox'] });
    } finally {
      setSending(false);
    }
  };

  // Mark notification as read
  const markRead = async (notif) => {
    await base44.entities.AgentNotification.update(notif.id, { ...notif, is_read: true });
    queryClient.invalidateQueries({ queryKey: ['axi-notifs-inbox'] });
  };

  const unreadCount = axiNotifs.filter(n => !n.is_read).length;
  const allMessages = [...messages].slice(0, 40);

  const statusColor = {
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    responded: 'bg-purple-100 text-purple-700',
    read: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${pulse ? 'bg-green-500' : 'bg-indigo-600'} transition-colors duration-300`}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">Agent Inbox</h1>
                <span className={`w-2.5 h-2.5 rounded-full ${pulse ? 'bg-green-400 animate-ping' : 'bg-green-400'}`} />
                <span className="text-xs font-semibold text-green-600">LIVE</span>
              </div>
              <p className="text-sm text-gray-500">Real-time agent-to-agent communications</p>
            </div>
          </div>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-300 px-3 py-1.5 rounded-full font-bold animate-pulse">
                <Bell className="w-3 h-3" /> {unreadCount} unread for Axi
              </span>
            )}
            <Button variant="outline" size="icon" onClick={() => {
              refetchMessages();
              refetchNotifs();
            }}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: Compose + Axi's Notification Feed */}
          <div className="space-y-4">

            {/* Compose */}
            <Card className="border-indigo-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-indigo-700">
                  <Send className="w-4 h-4" /> Send Message
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={toAgentId} onValueChange={setToAgentId}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select recipient" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={AXI_ID}>🌟 Axi (Mother Boss)</SelectItem>
                    {agents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name} ({a.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Type your message..."
                  value={composeText}
                  onChange={e => setComposeText(e.target.value)}
                  className="text-sm min-h-[100px]"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.ctrlKey) handleSend();
                  }}
                />
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  onClick={handleSend}
                  disabled={sending || !composeText.trim()}
                >
                  {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                  Send (Ctrl+Enter)
                </Button>
              </CardContent>
            </Card>

            {/* Axi's live notification feed */}
            <Card className="border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                  <Zap className="w-4 h-4" /> Axi's Live Feed
                  {unreadCount > 0 && (
                    <span className="ml-auto text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {/* Live notifications that came in this session */}
                {liveNotifications.map(n => (
                  <div key={n.id} className="p-2.5 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                    <div className="flex items-center gap-1 text-xs text-green-700 font-semibold mb-1">
                      <Zap className="w-3 h-3" /> NEW — {n.title}
                    </div>
                    <p className="text-xs text-green-800 line-clamp-2">{n.message}</p>
                  </div>
                ))}
                {axiNotifs.length === 0 && liveNotifications.length === 0 ? (
                  <div className="py-6 text-center text-gray-400 text-xs">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    No messages for Axi yet
                  </div>
                ) : (
                  axiNotifs.map(n => (
                    <div key={n.id} className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${n.is_read ? 'bg-gray-50 border-gray-200' : 'bg-purple-50 border-purple-200'}`}
                      onClick={() => !n.is_read && markRead(n)}>
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-gray-800 flex items-center gap-1">
                            {n.is_read ? <CheckCircle className="w-3 h-3 text-gray-400" /> : <Circle className="w-3 h-3 text-purple-500" />}
                            {n.title}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {n.created_date ? format(new Date(n.created_date), 'dd MMM HH:mm') : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Full message timeline */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2 text-gray-700">
                  <Users className="w-4 h-4" /> Village Message Timeline
                  <span className="ml-auto text-xs text-green-600 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Real-time
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {allMessages.length === 0 ? (
                    <div className="py-12 text-center text-gray-400">
                      <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No messages yet</p>
                    </div>
                  ) : allMessages.map(msg => {
                    const fromName = msg.metadata?.from_agent_name || msg.sender_agent_id || 'Unknown';
                    const toName = msg.metadata?.to_agent_name || msg.to_agent_id || '?';
                    const isToAxi = axiIds.includes(msg.to_agent_id);
                    return (
                      <div key={msg.id} className={`p-3 rounded-xl border transition-all ${isToAxi ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                            <span>{fromName}</span>
                            <ArrowRight className="w-3 h-3 text-gray-400" />
                            <span className={isToAxi ? 'text-purple-700' : ''}>{toName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {msg.status && (
                              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor[msg.status] || 'bg-gray-100 text-gray-600'}`}>
                                {msg.status}
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              {msg.created_date ? format(new Date(msg.created_date), 'dd MMM HH:mm') : ''}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-800">{msg.content || msg.message}</p>
                        {msg.response && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <div className="text-xs text-gray-500 mb-0.5 font-medium">↩ Response:</div>
                            <p className="text-sm text-gray-700 italic">{msg.response}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

const axiIds = ['axi_main_001', 'Axi', 'axi'];