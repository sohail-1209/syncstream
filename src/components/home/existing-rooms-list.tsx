'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { deleteRoom } from '@/app/actions';
import { Loader2, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Session {
  id: string;
}

export function ExistingRoomsList() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    const q = query(collection(db, 'sessions'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedSessions: Session[] = [];
      querySnapshot.forEach((doc) => {
        fetchedSessions.push({ id: doc.id });
      });
      setSessions(fetchedSessions);
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching sessions:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch existing rooms.',
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, toast]);

  const handleJoinRoom = (sessionId: string) => {
    router.push(`/watch/${sessionId}`);
  };

  const handleDeleteRoom = async (sessionId: string) => {
    const response = await deleteRoom(sessionId);
    if (response.error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: response.error,
        });
    } else {
        toast({
            title: 'Success',
            description: `Room ${sessionId} has been deleted.`,
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="lg" variant="secondary" className="font-bold text-lg px-8 py-6">
          <Users className="mr-2 h-6 w-6" />
          View Rooms
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Existing Rooms</DialogTitle>
          <DialogDescription>
            Join or delete an existing watch party.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[400px]">
          <ScrollArea className="h-full pr-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
                        <CardTitle className="text-sm font-medium font-mono tracking-wider">
                            {session.id}
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRoom(session.id)}
                            className="text-destructive hover:bg-destructive/10 h-8 w-8"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <Button className="w-full" onClick={() => handleJoinRoom(session.id)}>
                            Join Room
                        </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-10">
                <p>No active rooms found.</p>
                <p className="text-sm">Create one to get started!</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
