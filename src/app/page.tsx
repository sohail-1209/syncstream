
'use client';

import { Button } from '@/components/ui/button';
import { Clapperboard, Users, ArrowRight, Loader2, Download } from 'lucide-react';
import { Logo } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ExistingRoomsList } from '@/components/home/existing-rooms-list';
import { createRoomWithPassword } from './actions';
import { useToast } from '@/hooks/use-toast';
import { usePwaInstall } from '@/hooks/use-pwa-install';


export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const { handleInstall } = usePwaInstall();

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      router.push(`/watch/${roomCode.trim()}`);
    }
  };

  const handleCreateRoom = () => {
    startTransition(async () => {
        const result = await createRoomWithPassword(password);
        if (result.error) {
            toast({
                variant: 'destructive',
                title: 'Error creating room',
                description: result.error,
            });
        } else if (result.data) {
            router.push(`/watch/${result.data.sessionId}`);
        }
        setIsCreateRoomOpen(false);
        setPassword('');
    });
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 text-center md:p-8 bg-background">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="outline" onClick={handleInstall}>
            <Download className="mr-2 h-4 w-4" />
            Install App
        </Button>
        <ExistingRoomsList />
      </div>
      <div className="text-center space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-center items-center gap-4">
          <Logo className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-foreground font-headline tracking-tighter">
          SyncStream
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-muted-foreground">
          Your shared screen, perfectly in sync. Create private watch parties,
          chat in real-time, and get AI-powered recommendations for what to watch
          next.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4 sm:px-0">
           <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                <DialogTrigger asChild>
                    <Button size="lg" className="font-bold text-base md:text-lg px-6 md:px-8 py-4 md:py-6 w-full sm:w-auto">
                        <Clapperboard className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                        Create Watch Party
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Create a new Watch Party</DialogTitle>
                        <DialogDescription>
                           Set an optional password to make your room private.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="room-password" className="text-right">
                            Password
                        </Label>
                        <Input 
                            id="room-password" 
                            type="password"
                            placeholder="(optional)" 
                            className="col-span-3"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom()}
                        />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleCreateRoom} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clapperboard className="mr-2 h-4 w-4" />} Create Room
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="font-bold text-base md:text-lg px-6 md:px-8 py-4 md:py-6 w-full sm:w-auto">
                <ArrowRight className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                Join by Code
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Join a Watch Party</DialogTitle>
                <DialogDescription>
                  Enter the room code provided by the host to join the session.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="room-code" className="text-right">
                    Code
                  </Label>
                  <Input 
                    id="room-code" 
                    placeholder="Enter code" 
                    className="col-span-3"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleJoinRoom} disabled={!roomCode.trim()}>
                  <ArrowRight className="mr-2 h-4 w-4" /> Join Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </main>
  );
}
