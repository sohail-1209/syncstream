
'use client';

import { Button } from '@/components/ui/button';
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { LocalUser } from '@/hooks/use-local-user';

const EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

export default function EmojiBar({ sessionId, user }: { sessionId: string; user: LocalUser | null }) {
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
    <div className="absolute bottom-20 right-4 p-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-lg flex gap-1 z-50 items-center">
      {EMOJIS.map((emoji) => (
        <Button
          key={emoji}
          variant="ghost"
          size="icon"
          className="text-2xl hover:bg-accent/20"
          onClick={() => handleEmojiClick(emoji)}
          disabled={!user}
        >
          {emoji}
        </Button>
      ))}
    </div>
  );
}
