
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

type FlyingEmoji = {
  id: number;
  emoji: string;
  x: number;
};

export default function EmojiBar() {
  const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);

  const handleEmojiClick = (emoji: string) => {
    const newEmoji: FlyingEmoji = {
      id: Date.now() + Math.random(),
      emoji,
      x: Math.random() * 80 + 10, // Random horizontal position from 10% to 90%
    };

    setFlyingEmojis((current) => [...current, newEmoji]);

    setTimeout(() => {
      setFlyingEmojis((current) => current.filter((e) => e.id !== newEmoji.id));
    }, 3000); // Remove after 3s, matching animation duration
  };

  return (
    <>
      <div className="absolute bottom-20 right-4 p-2 bg-card/50 backdrop-blur-sm rounded-lg border border-border shadow-lg flex gap-1 z-50 items-center">
        {EMOJIS.map((emoji) => (
          <Button
            key={emoji}
            variant="ghost"
            size="icon"
            className="text-2xl hover:bg-accent/20"
            onClick={() => handleEmojiClick(emoji)}
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
        {flyingEmojis.map(({ id, emoji, x }) => (
          <span
            key={id}
            className="absolute bottom-20 animate-emoji-fly text-4xl"
            style={{ left: `${x}%` }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </>
  );
}
