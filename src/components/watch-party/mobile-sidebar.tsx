
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MobileChatPanel from "./mobile-chat-panel";
import MobileParticipantsPanel from "./mobile-participants-panel";
import { type LocalUser } from "@/hooks/use-local-user";

export default function MobileSidebar({ sessionId, user, hostId }: { sessionId: string; user: LocalUser | null, hostId: string | null }) {
  return (
    <Tabs defaultValue="chat" className="w-full flex-1 flex flex-col min-h-0">
      <div className="p-2 border-b flex-shrink-0">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="chat" className="flex-1 mt-0 min-h-0">
        <MobileChatPanel sessionId={sessionId} user={user} />
      </TabsContent>
      <TabsContent value="participants" className="flex-1 mt-0 min-h-0">
        <MobileParticipantsPanel sessionId={sessionId} hostId={hostId} />
      </TabsContent>
    </Tabs>
  );
}
