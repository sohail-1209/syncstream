'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const initialMessages = [
  { id: 1, user: { name: 'Alice', avatar: 'https://placehold.co/100x100/7c3aed/ffffff' }, text: 'This movie is amazing!', isMe: false },
  { id: 2, user: { name: 'You', avatar: 'https://placehold.co/100x100/f472b6/ffffff' }, text: 'Right? I told you it was good!', isMe: true },
  { id: 3, user: { name: 'Bob', avatar: 'https://placehold.co/100x100/2563eb/ffffff' }, text: 'Whoa, that plot twist!', isMe: false },
  { id: 4, user: { name: 'Alice', avatar: 'https://placehold.co/100x100/7c3aed/ffffff' }, text: 'I did not see that coming at all.', isMe: false },
];

export default function ChatPanel() {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      setMessages([
        ...messages,
        { id: Date.now(), user: { name: 'You', avatar: 'https://placehold.co/100x100/f472b6/ffffff' }, text: newMessage, isMe: true },
      ]);
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
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
            placeholder="Type a message..."
            autoComplete="off"
          />
          <Button type="submit" size="icon">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
