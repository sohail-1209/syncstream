'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Loader2 } from "lucide-react";
import type { LocalUser } from "@/hooks/use-local-user";

interface Participant extends LocalUser {}

export default function MobileParticipantsPanel({ hostId, participants, loading }: { hostId: string | null; participants: Participant[], loading: boolean }) {
  
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
