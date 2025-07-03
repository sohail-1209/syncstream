
'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import VideoPlayer from "@/components/watch-party/video-player";
import Sidebar from "@/components/watch-party/sidebar";
import RecommendationsModal from "@/components/watch-party/recommendations-modal";
import { Copy, Users, Wand2, Link as LinkIcon, Loader2, ScreenShare, LogOut, ArrowRight, Eye, VideoOff, Maximize, Minimize, PanelRightClose, PanelRightOpen, Mic, MicOff } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import { processAndGetVideoUrl, getSessionDetails, verifyPassword, getSessionPassword, setScreenSharer, getLiveKitToken, setVideoSourceForSession, updatePlaybackState } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { useLocalUser, type LocalUser } from "@/hooks/use-local-user";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection, onSnapshot, addDoc, type Timestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import LiveKitStage from "@/components/watch-party/livekit-stage";
import { cn } from "@/lib/utils";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from "@livekit/components-react";
import { DisconnectReason } from "livekit-client";


type AuthStatus = 'checking' | 'prompt_password' | 'authenticated' | 'error';
type PlaybackState = {
  isPlaying: boolean;
  seekTime: number;
  updatedBy: string;
  timestamp: number;
} | null;


function WatchPartyContent({
    sessionId,
    initialHasPassword,
    initialActiveSharer,
    initialVideoSource,
    initialPlaybackState,
    user
}: {
    sessionId: string,
    initialHasPassword: boolean,
    initialActiveSharer: string | null,
    initialVideoSource: ProcessVideoUrlOutput | null,
    initialPlaybackState: PlaybackState,
    user: LocalUser
}) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [inviteLink, setInviteLink] = useState('');
    const [videoSource, setVideoSource] = useState<ProcessVideoUrlOutput | null>(initialVideoSource);
    const [playbackState, setPlaybackState] = useState<PlaybackState>(initialPlaybackState);
    const [tempUrl, setTempUrl] = useState('');
    const [isVideoPopoverOpen, setIsVideoPopoverOpen] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);

    const [hasPassword, setHasPassword] = useState(initialHasPassword);
    const [sessionPassword, setSessionPassword] = useState<string | null>(null);
    const [isFetchingPassword, startFetchPasswordTransition] = useTransition();

    const [activeSharer, setActiveSharer] = useState<string | null>(initialActiveSharer);
    const [isTogglingShare, startShareToggleTransition] = useTransition();

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const pageRef = useRef<HTMLDivElement>(null);
    
    // LiveKit state
    const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
    const isMicMuted = !isMicrophoneEnabled;
    const amSharing = activeSharer === user?.id;

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setInviteLink(`${window.location.origin}/watch/${sessionId}`);
        }
    }, [sessionId]);
    
    useEffect(() => {
        const sessionRef = doc(db, "sessions", sessionId);
        const userRef = doc(collection(sessionRef, "participants"), user.id);

        const setPresence = async () => {
             await setDoc(sessionRef, { updatedAt: serverTimestamp() }, { merge: true });
             await setDoc(userRef, { ...user, lastSeen: serverTimestamp() }, { merge: true });
        }
        
        setPresence();

        const interval = setInterval(() => {
            setDoc(userRef, { lastSeen: serverTimestamp() }, { merge: true });
        }, 60 * 1000);

        return () => {
            clearInterval(interval);
        };
    }, [user, sessionId]);


    // Listen for session changes (sharer, video, playback)
    useEffect(() => {
        const sessionRef = doc(db, 'sessions', sessionId);
        const unsub = onSnapshot(sessionRef, (doc) => {
            const data = doc.data();
            setActiveSharer(data?.activeSharer ?? null);
            setVideoSource(data?.videoSource ?? null);
            
            const remotePlaybackState = data?.playbackState || null;
            if (remotePlaybackState && remotePlaybackState.timestamp && typeof remotePlaybackState.timestamp.toMillis === 'function') {
                 setPlaybackState({
                     ...remotePlaybackState,
                     timestamp: remotePlaybackState.timestamp.toMillis()
                 });
            } else {
                setPlaybackState(remotePlaybackState);
            }
        });
        return () => unsub();
    }, [sessionId]);
    
    // Sync local participant's screen share state with the activeSharer from DB
    useEffect(() => {
        if (localParticipant) {
            localParticipant.setScreenShareEnabled(amSharing, { audio: true });
        }
    }, [amSharing, localParticipant]);


    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);


    const handleSetVideo = () => {
        if (activeSharer) {
            toast({
                variant: 'destructive',
                title: 'Cannot set video during screen share.',
            });
            return;
        }
        setUrlError(null);
        startTransition(async () => {
            const result = await processAndGetVideoUrl(tempUrl);
            if (result.error) {
                setUrlError(result.error);
            } else if (result.data) {
                await setVideoSourceForSession(sessionId, result.data);
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
       startShareToggleTransition(async () => {
           if (activeSharer) {
                if (amSharing) {
                    await setScreenSharer(sessionId, null);
                } else {
                    toast({ variant: 'destructive', title: 'Action not allowed', description: 'Another user is already sharing their screen.' });
                }
           } else { 
                await setVideoSourceForSession(sessionId, null);
                await setScreenSharer(sessionId, user!.id);
           }
       })
    };
    
    const handleToggleMic = () => {
        if (localParticipant) {
            localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
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

    const handleExitRoom = async () => {
        if (amSharing) {
            await setScreenSharer(sessionId, null);
        }
        router.push('/');
    };
    
    const handleFetchPassword = () => {
        if (!sessionId) return;
        startFetchPasswordTransition(async () => {
            const result = await getSessionPassword(sessionId);
            if (result.error) {
                setSessionPassword('Error');
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            } else if (result.data) {
                setSessionPassword(result.data.password ?? 'No Password');
            }
        });
    };

    const toggleFullscreen = () => {
        if (!pageRef.current) return;

        if (!document.fullscreenElement) {
            pageRef.current.requestFullscreen().catch(err => {
                toast({
                    variant: 'destructive',
                    title: 'Fullscreen Error',
                    description: `Could not enter fullscreen mode: ${err.message}`
                });
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const handlePlaybackChange = useCallback(async (newState: { isPlaying: boolean; seekTime: number }) => {
        if (!user) return;
        await updatePlaybackState(sessionId, user.id, newState);
    }, [user, sessionId]);

    return (
        <div ref={pageRef} className="flex flex-col h-screen bg-background text-foreground">
            <header className="relative flex items-center justify-between px-4 py-2 border-b z-50">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl font-headline hidden sm:inline">SyncStream</span>
                </Link>

                <div className="hidden md:flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">ROOM CODE</span>
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-base font-mono tracking-widest px-3 py-1">{sessionId}</Badge>
                        {hasPassword && (
                            <Popover onOpenChange={(open) => {
                                if (open) {
                                    handleFetchPassword();
                                } else {
                                    setTimeout(() => setSessionPassword(null), 150);
                                }
                            }}>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                        <Eye className="h-4 w-4" />
                                        <span className="sr-only">Show Room Password</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-4">
                                    <div className="flex flex-col items-center gap-2 text-center">
                                        <h4 className="font-medium leading-none">Room Password</h4>
                                        <div className="min-h-[2rem] flex items-center justify-center">
                                            {isFetchingPassword || sessionPassword === null ? (
                                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground"/>
                                            ) : (
                                                <p className="font-mono text-lg font-bold text-primary">{sessionPassword}</p>
                                            )}
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        )}
                         <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={toggleFullscreen}
                            aria-label={isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                        >
                            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                            <span className="sr-only">{isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}</span>
                        </Button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RecommendationsModal>
                        <Button variant="outline">
                            <Wand2 className="h-4 w-4 mr-2" />
                            Get AI Recommendations
                        </Button>
                    </RecommendationsModal>

                    <Button variant="outline" size="icon" onClick={handleShareScreen} disabled={(activeSharer !== null && !amSharing) || isTogglingShare}>
                        {isTogglingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : (amSharing ? <VideoOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />)}
                        <span className="sr-only">{isTogglingShare ? "Loading..." : amSharing ? 'Stop Sharing' : 'Share Screen'}</span>
                    </Button>
                    
                    {localParticipant && (
                        <Button variant="outline" size="icon" onClick={handleToggleMic}>
                            {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            <span className="sr-only">{isMicMuted ? "Unmute" : "Mute"}</span>
                        </Button>
                    )}

                    <Popover open={isVideoPopoverOpen} onOpenChange={setIsVideoPopoverOpen}>
                        <PopoverTrigger asChild>
                             <Button variant="outline" size="icon" disabled={!!activeSharer}>
                                <LinkIcon className="h-4 w-4" />
                                <span className="sr-only">Set Video</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                            <div className="grid gap-4">
                                <div className="space-y-2">
                                    <h4 className="font-medium leading-none">Set Video Source</h4>
                                    <p className="text-sm text-muted-foreground">
                                        Paste a video link from YouTube, Vimeo, or another source. Our AI will try its best to identify and play it. Direct links to video files (.mp4, .m3u8) work best, but many other streaming links will work too.
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
                    <Button variant="outline" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden md:inline-flex">
                        {isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleExitRoom}>
                        <LogOut className="h-4 w-4" />
                        <span className="sr-only">Exit</span>
                    </Button>
                </div>
            </header>
            <main className={cn(
                "flex-1 flex flex-col md:grid gap-4 p-4",
                isSidebarOpen
                    ? "md:grid-cols-[1fr_350px] lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px]"
                    : "md:grid-cols-1"
            )}>
                <div className="md:col-start-1 md:row-start-1 w-full flex-shrink-0 md:flex-shrink aspect-video md:aspect-auto md:h-full min-h-0">
                   {activeSharer ? (
                        <LiveKitStage sharerId={activeSharer}/>
                   ) : (
                        <VideoPlayer 
                            videoSource={videoSource}
                            playbackState={playbackState}
                            onPlaybackChange={handlePlaybackChange}
                            user={user}
                        />
                   )}
                </div>
                <div className={cn(
                    "md:col-start-2 md:row-start-1 w-full flex-1 md:h-full min-h-0",
                    !isSidebarOpen && "hidden"
                )}>
                    <Sidebar sessionId={sessionId} user={user} />
                </div>
            </main>
        </div>
    );
}


export default function WatchPartyPage() {
    const params = useParams<{ sessionId: string }>();
    const router = useRouter();
    const { toast } = useToast();
    const localUser = useLocalUser();

    // Auth state
    const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
    const [authError, setAuthError] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [isVerifying, startVerifyTransition] = useTransition();

    const [sessionDetails, setSessionDetails] = useState<{ hasPassword: boolean; activeSharer: string | null; videoSource: ProcessVideoUrlOutput | null; playbackState: PlaybackState; } | null>(null);
    const [livekitToken, setLivekitToken] = useState<string>('');

    useEffect(() => {
        const checkSession = async () => {
            const result = await getSessionDetails(params.sessionId);
            if (result.error) {
                setAuthError(result.error);
                setAuthStatus('error');
            } else if (result.data) {
                setSessionDetails(result.data);
                if (result.data.hasPassword) {
                    setAuthStatus('prompt_password');
                } else {
                    setAuthStatus('authenticated');
                }
            }
        };
        checkSession();
    }, [params.sessionId]);
    
     useEffect(() => {
        if (authStatus !== 'authenticated' || !localUser) return;

        getLiveKitToken(params.sessionId, localUser.id)
            .then(result => {
                if (result.error) {
                    toast({
                        variant: 'destructive',
                        title: 'Could not connect to media server',
                        description: result.error,
                    })
                } else if (result.data) {
                    setLivekitToken(result.data.token);
                }
            });

    }, [localUser, params.sessionId, toast, authStatus]);


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
    
    if (authStatus === 'authenticated' && livekitToken && sessionDetails && localUser) {
        return (
            <LiveKitRoom
                token={livekitToken}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={(reason) => {
                    if (
                        reason === DisconnectReason.CLIENT_INITIATED ||
                        reason === DisconnectReason.SIGNAL_CLOSE ||
                        reason === DisconnectReason.DUPLICATE_IDENTITY
                    ) {
                       return;
                    }

                    toast({
                        variant: 'destructive',
                        title: 'Disconnected from room',
                        description: `The connection was lost unexpectedly. Reason: ${DisconnectReason[reason ?? DisconnectReason.UNKNOWN_REASON]}`,
                    });
                }}
            >
                <WatchPartyContent 
                    sessionId={params.sessionId}
                    initialHasPassword={sessionDetails.hasPassword}
                    initialActiveSharer={sessionDetails.activeSharer}
                    initialVideoSource={sessionDetails.videoSource}
                    initialPlaybackState={sessionDetails.playbackState}
                    user={localUser}
                />
                <RoomAudioRenderer />
            </LiveKitRoom>
        );
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
}

    
