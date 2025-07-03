
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getRooms, deleteRoom } from '@/app/actions';
import { Loader2, Trash2, Users, Lock, Unlock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Session {
  id: string;
  hasPassword: boolean;
}

export function ExistingRoomsList() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [passwordToDelete, setPasswordToDelete] = useState('');
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
        setSessions([]);
        return;
    };

    const fetchRooms = async () => {
        setIsLoading(true);
        const result = await getRooms();
        if (result.error && result.error) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: result.error,
            });
            setSessions([]);
        } else if (result.data) {
            setSessions(result.data);
        }
        setIsLoading(false);
    };

    fetchRooms();
  }, [isOpen, toast]);

  const handleJoinRoom = (sessionId: string) => {
    router.push(`/watch/${sessionId}`);
  };

  const attemptDelete = (session: Session) => {
    if (session.hasPassword) {
        setSessionToDelete(session);
    } else {
        handleFinalDelete(session.id);
    }
  }

  const handleFinalDelete = async (sessionId: string, password?: string) => {
    startDeleteTransition(async () => {
        const response = await deleteRoom(sessionId, password);
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
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        }
        setSessionToDelete(null);
        setPasswordToDelete('');
    });
  };

  const renderDeleteDialog = () => (
    <Dialog open={!!sessionToDelete} onOpenChange={() => {
        setSessionToDelete(null);
        setPasswordToDelete('');
    }}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Password Required</DialogTitle>
                <DialogDescription>
                    This room is password protected. Please enter the password to delete it.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <Label htmlFor="delete-password">Password</Label>
                <Input
                    id="delete-password"
                    type="password"
                    value={passwordToDelete}
                    onChange={(e) => setPasswordToDelete(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sessionToDelete && handleFinalDelete(sessionToDelete.id, passwordToDelete)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setSessionToDelete(null)}>Cancel</Button>
                <Button 
                    variant="destructive" 
                    onClick={() => sessionToDelete && handleFinalDelete(sessionToDelete.id, passwordToDelete)}
                    disabled={isDeleting}
                >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete Room
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
  );

  return (
    <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
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
                            <CardTitle className="text-sm font-medium font-mono tracking-wider flex items-center gap-2">
                                {session.hasPassword ? <Lock className="h-4 w-4 text-muted-foreground" /> : <Unlock className="h-4 w-4 text-muted-foreground" />}
                                {session.id}
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => attemptDelete(session)}
                                className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                disabled={isDeleting}
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
        {renderDeleteDialog()}
    </>
  );
}
