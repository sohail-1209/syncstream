import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Mic, MicOff, User } from "lucide-react";

const participants = [
    { id: 1, name: 'You', avatar: 'https://placehold.co/100x100/f472b6/ffffff', isHost: true, isMuted: false },
    { id: 2, name: 'Alice', avatar: 'https://placehold.co/100x100/7c3aed/ffffff', isHost: false, isMuted: false },
    { id: 3, name: 'Bob', avatar: 'https://placehold.co/100x100/2563eb/ffffff', isHost: false, isMuted: true },
    { id: 4, name: 'Charlie', avatar: 'https://placehold.co/100x100/10b981/ffffff', isHost: false, isMuted: false },
    { id: 5, name: 'Diana', avatar: 'https://placehold.co/100x100/f59e0b/ffffff', isHost: false, isMuted: false },
]

export default function ParticipantsPanel() {
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
                    {p.isHost && <Crown className="h-4 w-4 text-amber-400" />}
                    {p.isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4 text-green-400" />}
                </div>
            </div>
        ))}
      </div>
    </ScrollArea>
  );
}
