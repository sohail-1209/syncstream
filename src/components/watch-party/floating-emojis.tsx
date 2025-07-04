
'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, Timestamp, where } from "firebase/firestore";

interface Emoji {
    id: string;
    emoji: string;
}

type FlyingEmoji = Emoji & {
    x: number;
};

export default function FloatingEmojis({ sessionId }: { sessionId: string; }) {
    const [flyingEmojis, setFlyingEmojis] = useState<FlyingEmoji[]>([]);
    const mountTime = useRef(Timestamp.now());

    useEffect(() => {
        if (!sessionId) return;
        
        const q = query(
            collection(db, 'sessions', sessionId, 'emojis'), 
            where('timestamp', '>', mountTime.current),
            orderBy('timestamp', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const docData = change.doc.data();
                    const newEmoji: FlyingEmoji = {
                        id: change.doc.id,
                        emoji: docData.emoji,
                        x: Math.random() * 80 + 10,
                    };
                    
                    setFlyingEmojis((current) => [...current, newEmoji]);

                    setTimeout(() => {
                        setFlyingEmojis((current) => current.filter((e) => e.id !== newEmoji.id));
                    }, 3000); 
                }
            });
        });

        return () => unsubscribe();
    }, [sessionId]);

    return (
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
    );
}
