
'use client';

import { Button } from '@/components/ui/button';
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { LocalUser } from '@/hooks/use-local-user';
import { RefreshCw } from 'lucide-react';

const EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

export default function EmojiBar({ sessionId, user, isHost, onSync }: { sessionId: string; user: LocalUser | null, isHost: boolean, onSync: () => void }) {
  const handleEmojiClick = async (emoji: string) => {
    if (!user || !sessionId) return;
    
    try {
      await addDoc(collection(db, "sessions", sessionId, "emojis"), {
        emoji: emoji,
        user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar
        },
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending emoji reaction:", error);
    }
  };

  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-2 md:right-4 p-1 md:p-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-lg flex flex-col gap-1 md:gap-2 z-50">
      {!isHost && (
        <Button
            variant="ghost"
            size="icon"
            className="text-xl md:text-2xl hover:bg-accent/20 h-9 w-9 md:h-10 md:w-10"
            onClick={onSync}
            disabled={!user}
            title="Sync to Host"
        >
            <RefreshCw className="h-4 w-4" />
        </Button>
      )}
      {EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="icon"
          className="text-xl md:text-2xl hover:bg-accent/20 h-9 w-9 md:h-10 md:w-10"
          onClick={() => handleEmojiClick(emoji)}
          disabled={!user}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}
