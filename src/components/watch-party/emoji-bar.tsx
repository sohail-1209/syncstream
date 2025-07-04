'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { LocalUser } from '@/hooks/use-local-user';
import { RefreshCw, SmilePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

export default function EmojiBar({ sessionId, user, isHost, onSync }: { sessionId: string; user: LocalUser | null, isHost: boolean, onSync: () => void }) {
  const isMobile = useIsMobile();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

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

  if (isMobile) {
    return (
      <div className={cn(
        "absolute bottom-4 right-4 p-1 bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-lg flex flex-row-reverse items-center gap-1 z-50 pointer-events-auto"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="hover:bg-accent/20 h-8 w-8"
          onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)}
        >
          {isEmojiPickerOpen ? <X className="h-5 w-5" /> : <SmilePlus className="h-5 w-5" />}
          <span className="sr-only">Toggle Emoji Bar</span>
        </Button>

        {isEmojiPickerOpen && (
          <>
            {!isHost && (
              <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-accent/20 h-8 w-8"
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
                className="text-lg hover:bg-accent/20 h-8 w-8"
                onClick={() => handleEmojiClick(emoji)}
                disabled={!user}
              >
                {emoji}
              </Button>
            ))}
          </>
        )}
      </div>
    )
  }

  // Desktop view
  return (
    <div className={cn(
      "absolute p-1 bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-lg flex gap-1 z-50 pointer-events-auto",
      "top-1/2 bottom-auto right-4 -translate-y-1/2 flex-col" // Desktop
    )}>
      {!isHost && (
        <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent/20 h-10 w-10"
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
          className="text-2xl hover:bg-accent/20 h-10 w-10"
          onClick={() => handleEmojiClick(emoji)}
          disabled={!user}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}
