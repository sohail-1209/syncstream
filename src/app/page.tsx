'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clapperboard, Users, ArrowRight } from 'lucide-react';
import { Logo } from '@/components/icons';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExistingRoomsList } from '@/components/home/existing-rooms-list';


export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const router = useRouter();

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      router.push(`/watch/${roomCode.trim()}`);
    }
  };

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8);
    router.push(`/watch/${newRoomId}`);
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="text-center space-y-6 max-w-2xl mx-auto">
        <div className="flex justify-center items-center gap-4">
          <Logo className="h-16 w-16 text-primary" />
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-foreground font-headline tracking-tighter">
          SyncStream
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground">
          Your shared screen, perfectly in sync. Create private watch parties,
          chat in real-time, and get AI-powered recommendations for what to watch
          next.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
           <Button onClick={handleCreateRoom} size="lg" className="font-bold text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Clapperboard className="mr-2 h-6 w-6" />
              Create Watch Party
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" variant="outline" className="font-bold text-lg px-8 py-6">
                <ArrowRight className="mr-2 h-6 w-6" />
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
          <ExistingRoomsList />
        </div>
      </div>
    </main>
  );
}
