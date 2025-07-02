import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChatPanel from "./chat-panel";
import ParticipantsPanel from "./participants-panel";
import { type LocalUser } from "@/hooks/use-local-user";

export default function Sidebar({ sessionId, user }: { sessionId: string; user: LocalUser | null }) {
  return (
    <Card className="w-full h-full flex flex-col">
      <Tabs defaultValue="chat" className="w-full flex-1 flex flex-col">
        <div className="p-2 border-b">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="chat" className="flex-1 overflow-auto mt-0">
          <ChatPanel sessionId={sessionId} user={user} />
        </TabsContent>
        <TabsContent value="participants" className="flex-1 overflow-auto mt-0">
          <ParticipantsPanel sessionId={sessionId} />
        </TabsContent>
      </Tabs>
    </Card>
  );
}
