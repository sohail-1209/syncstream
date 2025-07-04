'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { type LocalUser } from '@/hooks/use-local-user';
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, type Timestamp } from "firebase/firestore";

interface Message {
    id: string;
    user: { name: string; avatar: string; id: string };
    text: string;
    isMe?: boolean;
    timestamp?: Timestamp;
}

interface Participant extends LocalUser {}

export default function ChatPanel({ sessionId, user, participants, participantsLoading }: { sessionId: string; user: LocalUser | null, participants: Participant[], participantsLoading: boolean }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messagesLoading, setMessagesLoading] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const participantsMap = useMemo(() => {
    return new Map(participants.map(p => [p.id, p]));
  }, [participants]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);
  
  useEffect(() => {
      if (!sessionId || participantsLoading) return;
      
      setMessagesLoading(true);
      const q = query(collection(db, 'sessions', sessionId, 'messages'), orderBy('timestamp', 'asc'));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedMessages: Message[] = [];
          querySnapshot.forEach((doc) => {
              const data = doc.data();
              const messageUserId = data.userId || data.user?.id;
              const participant = participantsMap.get(messageUserId);

              // Use participant data if available, otherwise fallback to old message format
              const messageUser = participant ? 
                { id: participant.id, name: participant.name, avatar: participant.avatar } :
                (data.user || { id: 'unknown', name: 'Unknown', avatar: '' });

              fetchedMessages.push({
                  id: doc.id,
                  user: messageUser,
                  text: data.text,
                  timestamp: data.timestamp,
                  isMe: user?.id === messageUser.id
              });
          });
          setMessages(fetchedMessages);
          setMessagesLoading(false);
      });

      return () => unsubscribe();
  }, [sessionId, user, participantsMap, participantsLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && user) {
      const text = newMessage;
      setNewMessage('');
      await addDoc(collection(db, "sessions", sessionId, "messages"), {
        text: text,
        userId: user.id, // Store userId instead of the whole user object
        timestamp: serverTimestamp()
      });
    }
  };

  if (messagesLoading || participantsLoading) {
      return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="space-y-4 p-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-end gap-2',
                msg.isMe ? 'justify-end' : 'justify-start'
              )}
            >
              {!msg.isMe && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.user.avatar} alt={msg.user.name} />
                  <AvatarFallback>{msg.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs rounded-lg px-3 py-2 text-sm',
                  msg.isMe
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {!msg.isMe && <p className="font-semibold text-xs mb-1 text-accent">{msg.user.name}</p>}
                <p>{msg.text}</p>
              </div>
               {msg.isMe && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.user.avatar} alt={msg.user.name} />
                  <AvatarFallback>{msg.user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={user ? "Type a message..." : "Loading..."}
            autoComplete="off"
            disabled={!user}
          />
          <Button type="submit" size="icon" disabled={!user || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
