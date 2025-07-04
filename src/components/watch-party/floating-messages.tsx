
'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy, Timestamp } from "firebase/firestore";
import type { LocalUser } from '@/hooks/use-local-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface Message {
    id: string;
    user: { name: string; avatar: string; id:string; };
    text: string;
}

type FlyingMessage = Message & {
    x: number;
};

export default function FloatingMessages({ sessionId, user }: { sessionId: string; user: LocalUser | null }) {
    const [flyingMessages, setFlyingMessages] = useState<FlyingMessage[]>([]);
    const mountTime = useRef(Timestamp.now());

    useEffect(() => {
        if (!sessionId) return;
        
        const q = query(
            collection(db, 'sessions', sessionId, 'messages'), 
            orderBy('timestamp', 'asc'),
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const docData = change.doc.data();
                const messageTimestamp = docData.timestamp as Timestamp;

                if (change.type === "added" && messageTimestamp && messageTimestamp.toMillis() > mountTime.current.toMillis()) {
                    // Don't show your own messages floating
                    const messageSenderId = docData.userId || docData.user?.id;
                    if (messageSenderId === user?.id) {
                        return;
                    }

                    // Gracefully handle messages that might not have the user object
                    if (!docData.user) {
                        return;
                    }

                    const newMessage: FlyingMessage = {
                        id: change.doc.id,
                        user: docData.user,
                        text: docData.text,
                        x: Math.random() * 70 + 15, // Horizontal position from 15% to 85% to avoid edges
                    };
                    
                    setFlyingMessages((current) => [...current, newMessage].slice(-10)); // Max 10 messages on screen

                    setTimeout(() => {
                        setFlyingMessages((current) => current.filter((m) => m.id !== newMessage.id));
                    }, 5900); // Should be slightly less than animation duration
                }
            });
        });

        return () => unsubscribe();
    }, [sessionId, user?.id]);

    return (
        <div className="absolute inset-0 bottom-20 overflow-hidden pointer-events-none z-30">
            {flyingMessages.map(({ id, user, text, x }) => (
                <div
                    key={id}
                    className="absolute bottom-0 animate-message-fly"
                    style={{ left: `${x}%`, transform: 'translateX(-50%)' }} // Center the message on the x-coordinate
                >
                    <div className="flex items-center gap-2 p-2 pr-3 rounded-full bg-card/80 backdrop-blur-sm shadow-lg border border-border max-w-xs">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs font-semibold text-muted-foreground truncate">{user.name}</span>
                            <span className="text-sm font-medium text-card-foreground truncate">{text}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
