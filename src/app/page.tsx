'use client';

import { Button } from '@/components/ui/button';
import { 
  Clapperboard, 
  Users, 
  ArrowRight, 
  Loader2, 
  Download, 
  HelpCircle,
  Wand2,
  Link as LinkIcon,
  ScreenShare,
  Crown,
  PanelRightOpen,
  Mic,
  RefreshCw
} from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExistingRoomsList } from '@/components/home/existing-rooms-list';
import { createRoomWithPassword } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';


interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function Home() {
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      console.log('`beforeinstallprompt` event has fired.');
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
        toast({
            variant: 'destructive',
            title: 'Installation Not Available',
            description: 'The app is not ready to be installed. This might be because your browser does not support it, or it is already installed.'
        });
        return;
    };
    
    await installPrompt.prompt();
    
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
        toast({
            title: 'Installation Complete!',
            description: 'The app has been added to your home screen.'
        });
    }
    setInstallPrompt(null);
  };

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
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                    <HelpCircle className="h-4 w-4" />
                    <span className="sr-only">Help</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-4">
              <h4 className="font-medium leading-none mb-4 text-center">App Guide</h4>
              <ScrollArea className="h-[450px]">
                <div className="space-y-4 text-sm p-1">
                  <div>
                      <h5 className="font-semibold text-lg leading-none mb-4 text-primary">Homepage</h5>
                      <div className="space-y-4 text-sm">
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <Download className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Install App</p>
                                  <p className="text-muted-foreground">Installs SyncStream on your device for offline use and easy access from your home screen.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <Users className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">View Rooms</p>
                                  <p className="text-muted-foreground">See a list of all active watch parties. You can join a public room or delete one you created.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <Clapperboard className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Create Watch Party</p>
                                  <p className="text-muted-foreground">Start a new watch party session. You can set an optional password to make it private.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <ArrowRight className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Join by Code</p>
                                  <p className="text-muted-foreground">Enter a unique code from a friend to join their watch party session directly.</p>
                              </div>
                          </div>
                      </div>
                  </div>

                  <Separator className="my-4" />

                  <div>
                      <h5 className="font-semibold text-lg leading-none mb-4 text-primary">Watch Party</h5>
                      <div className="space-y-4 text-sm">
                           <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <Crown className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Become Host</p>
                                  <p className="text-muted-foreground">Take control of the room. The host can change the video, start screen shares, and sync playback for everyone.</p>
                              </div>
                          </div>
                           <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <LinkIcon className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Set Video</p>
                                  <p className="text-muted-foreground">The host can load a video by providing a URL from YouTube, Vimeo, or a direct link.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <ScreenShare className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Share Screen</p>
                                  <p className="text-muted-foreground">The host can share their screen, perfect for content that isn't supported by direct links.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <Wand2 className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">AI Recommendations</p>
                                  <p className="text-muted-foreground">Get AI-powered movie and show recommendations based on your group's tastes.</p>
                              </div>
                          </div>
                           <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <Mic className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Toggle Mic</p>
                                  <p className="text-muted-foreground">Mute or unmute your microphone to talk with others in the room.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <PanelRightOpen className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Chat & Participants</p>
                                  <p className="text-muted-foreground">Open the side panel to chat with others and see who's currently in the session.</p>
                              </div>
                          </div>
                          <div className="flex items-start gap-4">
                              <div className="p-2 bg-muted rounded-md shrink-0">
                                  <RefreshCw className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                  <p className="font-semibold">Sync to Host</p>
                                  <p className="text-muted-foreground">If your video falls out of sync, click this to jump to the host's current playback time.</p>
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              </ScrollArea>
            </PopoverContent>
        </Popover>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" onClick={handleInstall}>
                    <Download className="mr-2 h-4 w-4" />
                    Install App
                </Button>
            </TooltipTrigger>
            {!installPrompt && (
                <TooltipContent>
                    <p>App is not installable yet or is already installed.</p>
                </TooltipContent>
            )}
        </Tooltip>
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
