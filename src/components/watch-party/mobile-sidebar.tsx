'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MobileChatPanel from "./mobile-chat-panel";
import MobileParticipantsPanel from "./mobile-participants-panel";
import { type LocalUser } from "@/hooks/use-local-user";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, orderBy } from "firebase/firestore";

interface Participant extends LocalUser {}

export default function MobileSidebar({ sessionId, user, hostId }: { sessionId: string; user: LocalUser | null, hostId: string | null }) {
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

  return (
    <Tabs defaultValue="chat" className="w-full flex-1 flex flex-col min-h-0">
      <div className="p-2 border-b flex-shrink-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="chat" className="flex-1 mt-0 min-h-0">
        <MobileChatPanel sessionId={sessionId} user={user} participants={participants} participantsLoading={loading} />
      </TabsContent>
      <TabsContent value="participants" className="flex-1 mt-0 min-h-0">
        <MobileParticipantsPanel hostId={hostId} participants={participants} loading={loading} />
      </TabsContent>
    </Tabs>
  );
}
