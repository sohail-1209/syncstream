
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";
import { useEffect, useState } from "react";
import type { LocalUser } from "@/hooks/use-local-user";
import { cn } from "@/lib/utils";

interface Participant extends LocalUser {}

export default function ParticipantsPanel({ sessionId, hostId }: { sessionId: string; hostId: string | null }) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    const q = query(collection(db, "sessions", sessionId, "participants"), orderBy("name"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedParticipants: Participant[] = [];
      querySnapshot.forEach((doc) => {
        fetchedParticipants.push(doc.data() as Participant);
      });
      setParticipants(fetchedParticipants);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching participants:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId]);
  
  if (loading) {
    return (
        <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {participants.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                <div className="flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={p.avatar} alt={p.name} />
                        <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{p.name}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                    {p.id === hostId && <Crown className="h-5 w-5 text-amber-400" />}
                </div>
            </div>
        ))}
      </div>
    </ScrollArea>
  );
}
