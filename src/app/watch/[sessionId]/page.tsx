
'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import VideoPlayer from "@/components/watch-party/video-player";
import Sidebar from "@/components/watch-party/sidebar";
import RecommendationsModal from "@/components/watch-party/recommendations-modal";
import { Copy, Users, Wand2, Link as LinkIcon, Loader2, ScreenShare, LogOut, ArrowRight } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import { processAndGetVideoUrl, getSessionDetails, verifyPassword } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { useLocalUser } from "@/hooks/use-local-user";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type AuthStatus = 'checking' | 'prompt_password' | 'authenticated' | 'error';

export default function WatchPartyPage() {
    const params = useParams<{ sessionId: string }>();
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [inviteLink, setInviteLink] = useState('');
    const [videoSource, setVideoSource] = useState<ProcessVideoUrlOutput | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [tempUrl, setTempUrl] = useState('');
    const [isVideoPopoverOpen, setIsVideoPopoverOpen] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const localUser = useLocalUser();

    const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
    const [authError, setAuthError] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [isVerifying, startVerifyTransition] = useTransition();


    useEffect(() => {
        const checkPassword = async () => {
            const result = await getSessionDetails(params.sessionId);
            if (result.error) {
                setAuthError(result.error);
                setAuthStatus('error');
            } else if (result.data) {
                if (result.data.hasPassword) {
                    setAuthStatus('prompt_password');
                } else {
                    setAuthStatus('authenticated');
                }
            }
        };
        checkPassword();
    }, [params.sessionId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setInviteLink(`${window.location.origin}/watch/${params.sessionId}`);
        }
    }, [params.sessionId]);

    useEffect(() => {
        if (authStatus !== 'authenticated' || !localUser || !params.sessionId) return;

        const sessionRef = doc(db, "sessions", params.sessionId);
        const userRef = doc(collection(sessionRef, "participants"), localUser.id);

        const setPresence = async () => {
             await setDoc(sessionRef, { updatedAt: serverTimestamp() }, { merge: true });
             await setDoc(userRef, { ...localUser, lastSeen: serverTimestamp() }, { merge: true });
        }
        
        setPresence();

        const interval = setInterval(() => {
            setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
        }, 60 * 1000);

        return () => {
            clearInterval(interval);
        };
    }, [localUser, params.sessionId, authStatus]);

    const handleSetVideo = () => {
        if (screenStream) {
            screenStream.getTracks().forEach(track => track.stop());
            setScreenStream(null);
        }
        setUrlError(null);
        startTransition(async () => {
            const result = await processAndGetVideoUrl(tempUrl);
            if (result.error) {
                setUrlError(result.error);
            } else if (result.data) {
                setVideoSource(result.data);
                setIsVideoPopoverOpen(false);
                setTempUrl('');
                toast({
                  title: "Video Loaded!",
                  description: `Playing from ${result.data.platform}.`
                })
            }
        });
    };

    const handleShareScreen = async () => {
        try {
            if (screenStream) {
                screenStream.getTracks().forEach(track => track.stop());
                setScreenStream(null);
                toast({
                    title: "Screen Sharing Stopped",
                });
                return;
            }

            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
            setVideoSource(null);
            setScreenStream(stream);

            stream.getVideoTracks()[0].addEventListener('ended', () => {
                setScreenStream(null);
                toast({
                    title: "Screen Sharing Stopped",
                });
            });

            toast({
                title: "Screen Sharing Started",
                description: "You are now sharing your screen.",
            });

        } catch (error) {
            console.error("Screen share error:", error);
            if ((error as DOMException).name !== 'NotAllowedError') {
              toast({
                  variant: 'destructive',
                  title: 'Screen Share Failed',
                  description: 'Could not start screen sharing. Please grant permission and try again.',
              });
            }
        }
    };
    
    const handleCopyInvite = () => {
        if (!inviteLink) return;
        navigator.clipboard.writeText(inviteLink).then(() => {
            toast({
                title: "Copied!",
                description: "Invite link copied to clipboard.",
            });
        });
    }

    const handleExitRoom = () => {
        router.push('/');
    };
    
    const handleVerifyPassword = () => {
        startVerifyTransition(async () => {
            setAuthError(null);
            const result = await verifyPassword(params.sessionId, passwordInput);
            if (result.error) {
                setAuthError(result.error);
            } else if (result.data?.success) {
                setAuthStatus('authenticated');
            } else {
                setAuthError("Incorrect password. Please try again.");
            }
        });
    }


    if (authStatus === 'checking') {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    if (authStatus === 'error') {
         return (
            <div className="flex h-screen w-full items-center justify-center bg-background text-center p-4">
                <div>
                    <h1 className="text-2xl font-bold text-destructive">Error</h1>
                    <p className="text-muted-foreground">{authError || 'An unknown error occurred.'}</p>
                    <Button onClick={() => router.push('/')} className="mt-4">Go Home</Button>
                </div>
            </div>
        );
    }
    
    if (authStatus === 'prompt_password') {
        return (
             <Dialog open={true} onOpenChange={(isOpen) => !isOpen && router.push('/')}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Password Required</DialogTitle>
                        <DialogDescription>
                            This watch party is private. Please enter the password to join.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="join-password">Password</Label>
                        <Input
                            id="join-password"
                            type="password"
                            placeholder="Enter password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                            disabled={isVerifying}
                        />
                         {authError && <p className="text-xs text-destructive pt-2">{authError}</p>}
                    </div>
                    <DialogFooter className="sm:justify-between">
                         <Button variant="outline" onClick={() => router.push('/')}>
                            <LogOut className="mr-2 h-4 w-4"/> Leave
                        </Button>
                        <Button onClick={handleVerifyPassword} disabled={isVerifying}>
                            {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />} Join Session
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }


    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            <header className="flex items-center justify-between px-4 py-2 border-b">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl font-headline hidden sm:inline">SyncStream</span>
                </Link>

                <div className="hidden md:flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">ROOM CODE</span>
                    <Badge variant="outline" className="text-base font-mono tracking-widest px-3 py-1">{params.sessionId}</Badge>
                </div>

                <div className="flex items-center gap-2">
                    <RecommendationsModal>
                        <Button variant="outline">
                            <Wand2 className="h-4 w-4 mr-2" />
                            Get AI Recommendations
                        </Button>
                    </RecommendationsModal>

                     <Button variant="outline" onClick={handleShareScreen}>
                        <ScreenShare className="h-4 w-4 mr-2" />
                        {screenStream ? 'Stop Sharing' : 'Share Screen'}
                    </Button>

                    <Popover open={isVideoPopoverOpen} onOpenChange={setIsVideoPopoverOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline">
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Set Video
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Set Video Source</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Paste a direct link to a video file (.mp4, .webm), or a link from YouTube or Vimeo. Our AI will handle the rest. Note: Links to streaming site webpages may not work due to embedding restrictions.
                                    </p>
                                </div>
                                <div className="grid gap-2">
                                     <div className="flex items-center space-x-2">
                                         <Input
                                             placeholder="https://youtube.com/watch?v=..."
                                             value={tempUrl}
                                             onChange={(e) => setTempUrl(e.target.value)}
                                             onKeyDown={(e) => e.key === 'Enter' && handleSetVideo()}
                                             className="h-8"
                                             disabled={isPending}
                                         />
                                         <Button onClick={handleSetVideo} size="sm" className="h-8" disabled={isPending}>
                                             {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
                                         </Button>
                                     </div>
                                     {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button>
                                <Users className="h-4 w-4 mr-2" />
                                Invite
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Invite friends</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Share this link with others to join the party. The code at the end is your room code.
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Input value={inviteLink} readOnly className="h-8"/>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleCopyInvite}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <Button variant="outline" onClick={handleExitRoom}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Exit
                    </Button>
                </div>
            </header>
            <main className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_350px] lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-4 p-4 overflow-hidden">
                <div className="md:col-start-1 md:row-start-1 w-full flex-shrink-0 md:flex-shrink aspect-video md:aspect-auto md:h-full min-h-0">
                    <VideoPlayer videoSource={videoSource} screenStream={screenStream} />
                </div>
                <div className="md:col-start-2 md:row-start-1 w-full flex-1 md:h-full min-h-0">
                    <Sidebar sessionId={params.sessionId} user={localUser} />
                </div>
            </main>
        </div>
    );
}
