import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Send, 
  Mail, 
  MailOpen, 
  Reply, 
  Inbox,
  Fingerprint,
  Clock,
  Search,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export default function DidMessaging() {
  const queryClient = useQueryClient();
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessage, setNewMessage] = useState({
    to_did: '',
    subject: '',
    content: ''
  });

  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: () => base44.auth.me()
  });

  const { data: myWallets = [] } = useQuery({
    queryKey: ['my-wallets'],
    queryFn: () => base44.entities.Wallet.filter({ owner_id: user?.id }),
    enabled: !!user?.id
  });

  const myDID = myWallets.length > 0 ? `did:xrpl:${myWallets[0].classic_address}` : null;

  const { data: receivedMessages = [] } = useQuery({
    queryKey: ['received-messages', myDID],
    queryFn: () => base44.entities.DidMessage.filter({ to_did: myDID }, '-created_date'),
    enabled: !!myDID,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const { data: sentMessages = [] } = useQuery({
    queryKey: ['sent-messages', myDID],
    queryFn: () => base44.entities.DidMessage.filter({ from_did: myDID }, '-created_date'),
    enabled: !!myDID,
    refetchInterval: 10000
  });

  const sendMutation = useMutation({
    mutationFn: (messageData) => base44.functions.invoke('sendDidMessage', messageData),
    onSuccess: () => {
      toast.success('Message sent successfully');
      setComposeOpen(false);
      setNewMessage({ to_did: '', subject: '', content: '' });
      queryClient.invalidateQueries(['sent-messages']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to send message');
    }
  });

  const markReadMutation = useMutation({
    mutationFn: (message_id) => base44.functions.invoke('markDidMessageRead', { message_id }),
    onSuccess: () => {
      queryClient.invalidateQueries(['received-messages']);
    }
  });

  const handleSendMessage = () => {
    if (!newMessage.to_did || !newMessage.content) {
      toast.error('Please fill in recipient DID and message content');
      return;
    }
    sendMutation.mutate(newMessage);
  };

  const handleSelectMessage = (message) => {
    setSelectedMessage(message);
    if (message.status === 'sent' && message.to_did === myDID) {
      markReadMutation.mutate(message.id);
    }
  };

  const handleReply = (message) => {
    setNewMessage({
      to_did: message.from_did,
      subject: `Re: ${message.subject}`,
      content: '',
      reply_to_message_id: message.id
    });
    setComposeOpen(true);
    setSelectedMessage(null);
  };

  const unreadCount = receivedMessages.filter(m => m.status === 'sent').length;

  const filteredReceived = receivedMessages.filter(m =>
    !searchTerm ||
    m.from_did.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSent = sentMessages.filter(m =>
    !searchTerm ||
    m.to_did.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!myDID) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <Fingerprint className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">You need a DID to send and receive messages</p>
            <Link to={createPageUrl('CreateDID')}>
              <Button>Create Your DID</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Mail className="w-10 h-10 text-indigo-600" />
                DID Messaging
              </h1>
              <p className="text-gray-600">Secure communication between decentralized identities</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-xs">Your DID: {myDID}</Badge>
                {unreadCount > 0 && (
                  <Badge className="bg-red-600">{unreadCount} unread</Badge>
                )}
              </div>
            </div>
            <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Compose
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>New Message</DialogTitle>
                  <DialogDescription>Send a secure message to another DID</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="to_did">Recipient DID</Label>
                    <Input
                      id="to_did"
                      placeholder="did:xrpl:rXXXXXXXXXXXXXXXXXX..."
                      value={newMessage.to_did}
                      onChange={(e) => setNewMessage({ ...newMessage, to_did: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Message subject"
                      value={newMessage.subject}
                      onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Message</Label>
                    <Textarea
                      id="content"
                      placeholder="Write your message..."
                      rows={6}
                      value={newMessage.content}
                      onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setComposeOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} disabled={sendMutation.isPending}>
                    {sendMutation.isPending ? 'Sending...' : 'Send Message'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Message List */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="inbox">
                  <TabsList className="w-full">
                    <TabsTrigger value="inbox" className="flex-1">
                      <Inbox className="w-4 h-4 mr-2" />
                      Inbox ({receivedMessages.length})
                    </TabsTrigger>
                    <TabsTrigger value="sent" className="flex-1">
                      <Send className="w-4 h-4 mr-2" />
                      Sent ({sentMessages.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="inbox" className="m-0">
                    <div className="divide-y max-h-[600px] overflow-y-auto">
                      {filteredReceived.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Mail className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>No messages received</p>
                        </div>
                      ) : (
                        filteredReceived.map((message) => (
                          <div
                            key={message.id}
                            onClick={() => handleSelectMessage(message)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                              selectedMessage?.id === message.id ? 'bg-indigo-50' : ''
                            } ${message.status === 'sent' ? 'bg-blue-50/30' : ''}`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                {message.status === 'sent' ? (
                                  <Mail className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <MailOpen className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-sm font-medium text-gray-900">
                                  {message.from_did.substring(0, 20)}...
                                </span>
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              {message.subject}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {message.content}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {new Date(message.created_date).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="sent" className="m-0">
                    <div className="divide-y max-h-[600px] overflow-y-auto">
                      {filteredSent.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                          <Send className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                          <p>No messages sent</p>
                        </div>
                      ) : (
                        filteredSent.map((message) => (
                          <div
                            key={message.id}
                            onClick={() => handleSelectMessage(message)}
                            className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                              selectedMessage?.id === message.id ? 'bg-indigo-50' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Send className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-900">
                                  To: {message.to_did.substring(0, 20)}...
                                </span>
                              </div>
                              {message.status === 'read' && (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              )}
                            </div>
                            <div className="text-sm font-medium text-gray-700 mb-1">
                              {message.subject}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {message.content}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                {new Date(message.created_date).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Message Detail */}
          <div className="col-span-2">
            {selectedMessage ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{selectedMessage.subject}</CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">From:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {selectedMessage.from_did}
                          </code>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">To:</span>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {selectedMessage.to_did}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-sm text-gray-600">
                          {new Date(selectedMessage.created_date).toLocaleString()}
                        </span>
                        {selectedMessage.is_verified && (
                          <Badge className="bg-green-600 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMessage(null)}
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="whitespace-pre-wrap text-gray-900">
                      {selectedMessage.content}
                    </div>
                  </div>
                  
                  {selectedMessage.from_did !== myDID && (
                    <div className="flex justify-end">
                      <Button onClick={() => handleReply(selectedMessage)}>
                        <Reply className="w-4 h-4 mr-2" />
                        Reply
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full">
                <CardContent className="flex items-center justify-center h-full py-20">
                  <div className="text-center text-gray-500">
                    <Mail className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>Select a message to view</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}