
'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import VideoPlayer, { type VideoPlayerRef, type VideoPlayerStatus } from "@/components/watch-party/video-player";
import Sidebar from "@/components/watch-party/sidebar";
import RecommendationsModal from "@/components/watch-party/recommendations-modal";
import { Copy, Users, Wand2, Link as LinkIcon, Loader2, ScreenShare, LogOut, ArrowRight, Eye, VideoOff, Maximize, Minimize, PanelRightClose, PanelRightOpen, Mic, MicOff, Crown, RefreshCw, MessageSquare, MoreVertical, RectangleHorizontal } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import { processAndGetVideoUrl, getSessionDetails, verifyPassword, getSessionPassword, setScreenSharer, getLiveKitToken, setVideoSourceForSession, updatePlaybackState, claimHost } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { useLocalUser, type LocalUser } from "@/hooks/use-local-user";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection, onSnapshot, addDoc, type Timestamp, query, orderBy, limit } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import LiveKitStage from "@/components/watch-party/livekit-stage";
import { cn } from "@/lib/utils";
import { LiveKitRoom, RoomAudioRenderer, useLocalParticipant } from "@livekit/components-react";
import { DisconnectReason } from "livekit-client";
import EmojiBar from "@/components/watch-party/emoji-bar";
import FloatingMessages from "@/components/watch-party/floating-messages";
import FloatingEmojis from "@/components/watch-party/floating-emojis";
import { Sheet, SheetContent, SheetHeader as SheetHeaderComponent, SheetTitle as SheetTitleComponent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileSidebar from "@/components/watch-party/mobile-sidebar";

type AuthStatus = 'checking' | 'prompt_password' | 'authenticated' | 'error';
type PlaybackState = {
  isPlaying: boolean;
  seekTime: number;
  updatedBy: string;
  updatedAt: number;
} | null;

function WatchPartyContent({
    sessionId,
    initialHasPassword,
    initialHostId,
    initialActiveSharer,
    initialVideoSource,
    initialPlaybackState,
    user
}: {
    sessionId: string,
    initialHasPassword: boolean,
    initialHostId: string | null,
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
    const [isSetVideoDialogOpen, setIsSetVideoDialogOpen] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);

    const [hasPassword, setHasPassword] = useState(initialHasPassword);
    const [sessionPassword, setSessionPassword] = useState<string | null>(null);
    const [isFetchingPassword, startFetchPasswordTransition] = useTransition();

    const [activeSharer, setActiveSharer] = useState<string | null>(initialActiveSharer);
    const [isTogglingShare, startShareToggleTransition] = useTransition();
    
    const [hostId, setHostId] = useState<string | null>(initialHostId);

    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isRotated, setIsRotated] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const pageRef = useRef<HTMLDivElement>(null);
    const isMobile = useIsMobile();
    
    // LiveKit state
    const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
    const isMicMuted = !isMicrophoneEnabled;
    const amSharing = activeSharer === user?.id;
    const isHost = user?.id === hostId;

    // Host control dialog state
    const [isHostPromptOpen, setIsHostPromptOpen] = useState(false);
    const [hostPassword, setHostPassword] = useState('');
    const [isClaimingHost, startClaimHostTransition] = useTransition();
    const videoPlayerRef = useRef<VideoPlayerRef>(null);
    const shownToastForUrl = useRef<string | null>(null);

    const [playerStatus, setPlayerStatus] = useState<VideoPlayerStatus>('idle');

    useEffect(() => {
        // Only show toast if status is ready, there's a video, and we haven't shown a toast for this specific URL yet.
        if (playerStatus === 'ready' && videoSource?.correctedUrl && shownToastForUrl.current !== videoSource.correctedUrl) {
            toast({
                title: "Video Loaded!",
                description: `Playing from ${videoSource.platform}.`
            });
            // Mark this URL as having had its toast shown.
            shownToastForUrl.current = videoSource.correctedUrl;
        }
    }, [playerStatus, videoSource, toast]);

    const handleSyncToHostClick = () => {
        if (!playbackState) {
            toast({
                variant: 'destructive',
                title: 'Sync Failed',
                description: 'No host playback data available to sync to.',
            });
            return;
        }
        videoPlayerRef.current?.syncToHost();
    };

    useEffect(() => {
        if (!isSetVideoDialogOpen) {
            setUrlError(null);
        }
    }, [isSetVideoDialogOpen]);


    useEffect(() => {
        if (typeof window !== 'undefined') {
            setInviteLink(`${window.location.origin}/watch/${sessionId}`);
        }
    }, [sessionId]);
    
    useEffect(() => {
        const sessionRef = doc(db, "sessions", sessionId);
        const userRef = doc(collection(sessionRef, "participants"), user.id);

        const setPresence = async () => {
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


    // Listen for session changes (sharer, video, playback, host)
    useEffect(() => {
        const sessionRef = doc(db, 'sessions', sessionId);
        const unsub = onSnapshot(sessionRef, (doc) => {
            const data = doc.data();
            setHostId(data?.hostId ?? null);
            setActiveSharer(data?.activeSharer ?? null);
            const newVideoSource = data?.videoSource ?? null;
            if (JSON.stringify(newVideoSource) !== JSON.stringify(videoSource)) {
                setVideoSource(newVideoSource);
            }
            
            const remotePlaybackData = data?.playbackState;
            if (remotePlaybackData && remotePlaybackData.updatedAt && typeof remotePlaybackData.updatedAt.toMillis === 'function') {
                const newPlaybackState = {
                    isPlaying: remotePlaybackData.isPlaying,
                    seekTime: remotePlaybackData.seekTime,
                    updatedBy: remotePlaybackData.updatedBy,
                    updatedAt: remotePlaybackData.updatedAt.toMillis(),
                };
                 if (JSON.stringify(newPlaybackState) !== JSON.stringify(playbackState)) {
                     setPlaybackState(newPlaybackState);
                }
            } else if (remotePlaybackData !== playbackState) {
                setPlaybackState(remotePlaybackData || null);
            }
        });
        return () => unsub();
    }, [sessionId, user?.id, videoSource, playbackState]);
    
    // Sync local participant's screen share state with the activeSharer from DB
    useEffect(() => {
        if (localParticipant) {
            localParticipant.setScreenShareEnabled(amSharing, { audio: true });
        }
    }, [amSharing, localParticipant]);


    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!document.fullscreenElement;
            setIsFullscreen(isCurrentlyFullscreen);
            if (!isCurrentlyFullscreen && isRotated) {
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
                setIsRotated(false);
            }
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [isRotated]);

    const handleRotate = async () => {
        if (!pageRef.current) return;
        try {
            if (!document.fullscreenElement) {
                await pageRef.current.requestFullscreen();
            }
            if (screen.orientation && screen.orientation.lock) {
                await screen.orientation.lock('landscape');
                setIsRotated(true);
            } else {
                throw new Error("Screen Orientation API not supported.");
            }
        } catch (err) {
            console.error("Could not lock orientation:", err);
            toast({
                variant: 'destructive',
                title: 'Rotation Failed',
                description: 'Your browser may not support screen rotation or requires being in fullscreen mode.'
            });
        }
    };

    const handleSetVideo = () => {
        if (!isHost) {
             toast({
                variant: 'destructive',
                title: 'Only the host can change the video.',
            });
            return;
        }
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
                setIsSetVideoDialogOpen(false);
                setTempUrl('');
            }
        });
    };

    const handleShareScreen = async () => {
       if (isMobile && !activeSharer) {
            toast({
                variant: 'destructive',
                title: 'Unsupported Feature',
                description: "Screen sharing is not supported on most mobile browsers. Please use a desktop browser.",
                duration: 5000,
            });
            return;
       }

       startShareToggleTransition(async () => {
           if (activeSharer) { // Someone is sharing
               if (amSharing || isHost) {
                   // If it's me sharing, OR if I'm the host, I can stop the share.
                   await setScreenSharer(sessionId, null);
               } else {
                   // It's someone else sharing, and I'm not the host. I can't do anything.
                   toast({ variant: 'destructive', title: 'Action not allowed', description: 'Another user is already sharing their screen.' });
               }
           } else { // No one is sharing
               if (isHost) {
                   // If I'm the host, I can start sharing.
                   await setVideoSourceForSession(sessionId, null);
                   await setScreenSharer(sessionId, user!.id);
               } else {
                   // I'm not the host, I can't start a share.
                   toast({ variant: 'destructive', title: 'Action not allowed', description: 'Only the host can start a screen share.' });
               }
           }
       });
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
        if (!user || !isHost) return;
        await updatePlaybackState(sessionId, user.id, newState);
    }, [user, sessionId, isHost]);

    const handleClaimHost = () => {
        if (!user) return;
        startClaimHostTransition(async () => {
            const result = await claimHost(sessionId, user.id, hostPassword);
            if (result.error) {
                toast({
                    variant: 'destructive',
                    title: 'Failed to update host',
                    description: result.error,
                });
            } else {
                toast({
                    title: 'Host Updated',
                    description: result.newHostId === user.id ? 'You are now the host.' : 'You are no longer the host.',
                });
            }
            setIsHostPromptOpen(false);
            setHostPassword('');
        });
    };

    const onHostButtonClick = () => {
        if (hasPassword) {
            setIsHostPromptOpen(true);
        } else {
            startClaimHostTransition(async () => {
                if (!user) return;
                const result = await claimHost(sessionId, user.id);
                if (result.error) {
                    toast({ variant: 'destructive', title: 'Failed to update host', description: result.error });
                } else {
                     toast({
                        title: 'Host Updated',
                        description: result.newHostId === user.id ? 'You are now the host.' : 'You are no longer the host.',
                    });
                }
            });
        }
    };

    const renderDesktopControls = () => (
        <div className="hidden md:flex items-center justify-between flex-1">
            <div className="flex-1" /> {/* Spacer */}
            
            {/* Center Controls */}
            <div className="flex flex-col items-center">
                <span className="text-xs text-muted-foreground">ROOM CODE</span>
                <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-base font-mono tracking-widest px-3 py-1">{sessionId}</Badge>
                    {hasPassword && (
                        <Popover onOpenChange={(open) => { if (open) handleFetchPassword(); else setTimeout(() => setSessionPassword(null), 150); }}>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><Eye className="h-4 w-4" /></Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-4">
                                {isFetchingPassword || sessionPassword === null ? <Loader2 className="h-5 w-5 animate-spin"/> : <p className="font-mono text-lg font-bold text-primary">{sessionPassword}</p>}
                            </PopoverContent>
                        </Popover>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={toggleFullscreen}><span className="sr-only">Toggle Fullscreen</span>{isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}</Button>
                    {!isHost && (videoSource || activeSharer) && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={handleSyncToHostClick} title="Sync to Host"><RefreshCw className="h-4 w-4" /></Button>
                    )}
                </div>
            </div>

            {/* Right Controls */}
            <div className="flex-1 flex justify-end items-center gap-1">
                <Button variant={isHost ? 'default' : 'outline'} size="sm" className="h-8" onClick={onHostButtonClick} disabled={isClaimingHost}>
                    {isClaimingHost ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crown className="h-4 w-4" />}
                    <span className="hidden lg:inline">{isHost ? 'Abdicate Host' : 'Become Host'}</span>
                </Button>
                <RecommendationsModal><Button variant="outline" size="sm" className="h-8"><Wand2 className="h-4 w-4" /><span className="hidden lg:inline">AI Recs</span></Button></RecommendationsModal>
                <Button variant="outline" size="sm" className="h-8" onClick={handleShareScreen} disabled={isTogglingShare}>
                    {isTogglingShare ? <Loader2 className="h-4 w-4 animate-spin" /> : (amSharing ? <VideoOff className="h-4 w-4" /> : <ScreenShare className="h-4 w-4" />)}
                    <span className="hidden lg:inline">{amSharing ? 'Stop Sharing' : 'Share Screen'}</span>
                </Button>
                {localParticipant && <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleToggleMic}>{isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}</Button>}
                <Button variant="outline" size="icon" className="h-8 w-8" disabled={!isHost} onClick={() => setIsSetVideoDialogOpen(true)}><LinkIcon className="h-4 w-4" /></Button>
                <Popover>
                    <PopoverTrigger asChild><Button size="sm" className="h-8"><Users className="h-4 w-4" /><span className="hidden lg:inline">Invite</span></Button></PopoverTrigger>
                    <PopoverContent className="w-[90vw] sm:w-80">
                        <div className="space-y-2"><h4 className="font-medium">Invite friends</h4><p className="text-sm text-muted-foreground">Share this link to invite others.</p></div>
                        <div className="flex items-center gap-2 mt-2"><Input value={inviteLink} readOnly /><Button variant="outline" size="icon" onClick={handleCopyInvite}><Copy className="h-4 w-4" /></Button></div>
                    </PopoverContent>
                </Popover>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>{isSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}</Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleExitRoom}><LogOut className="h-4 w-4" /></Button>
            </div>
        </div>
    );

    const renderMobileControls = () => (
        <div className="flex items-center gap-1 md:hidden">
            {!isHost && (videoSource || activeSharer) && (
                <Button variant="ghost" size="icon" onClick={handleSyncToHostClick} title="Sync to Host">
                    <RefreshCw className="h-5 w-5" />
                </Button>
            )}
             <Button variant="ghost" size="icon" onClick={handleRotate} title="Rotate Screen">
                <RectangleHorizontal className="h-5 w-5" />
            </Button>
            <Sheet>
                <SheetTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-5 w-5" /></Button></SheetTrigger>
                <SheetContent side="bottom" className="p-4 pt-2 w-full h-auto rounded-t-lg" container={pageRef.current}>
                    <SheetHeaderComponent><SheetTitleComponent className="text-center mb-2">Menu</SheetTitleComponent></SheetHeaderComponent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Room Info */}
                        <div className="flex justify-between items-center p-2 rounded-lg bg-muted col-span-full">
                           <div className="flex flex-col">
                             <span className="text-xs text-muted-foreground">ROOM CODE</span>
                             <span className="font-mono">{sessionId}</span>
                           </div>
                           {hasPassword && (
                             <Popover onOpenChange={(open) => { if (open) handleFetchPassword(); else setTimeout(() => setSessionPassword(null), 150); }}>
                                 <PopoverTrigger asChild><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></PopoverTrigger>
                                 <PopoverContent className="w-auto p-4">{isFetchingPassword || sessionPassword === null ? <Loader2 className="h-5 w-5 animate-spin"/> : <p className="font-mono text-lg font-bold text-primary">{sessionPassword}</p>}</PopoverContent>
                             </Popover>
                           )}
                        </div>
                        {/* Actions */}
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsMobileSidebarOpen(true)}>
                            <MessageSquare /> Chat / Participants
                        </Button>
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={onHostButtonClick} disabled={isClaimingHost}>{isClaimingHost ? <Loader2 className="animate-spin" /> : <Crown />} {isHost ? 'Abdicate Host' : 'Become Host'}</Button>
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleShareScreen} disabled={isTogglingShare}>{isTogglingShare ? <Loader2 className="animate-spin" /> : (amSharing ? <VideoOff /> : <ScreenShare />)} {amSharing ? 'Stop Sharing' : 'Share Screen'}</Button>
                        <Button variant="outline" className="w-full justify-start gap-2" disabled={!isHost} onClick={() => setIsSetVideoDialogOpen(true)}>
                            <LinkIcon /> Set Video
                        </Button>
                        {localParticipant && <Button variant="outline" className="w-full justify-start gap-2" onClick={handleToggleMic}>{isMicMuted ? <MicOff /> : <Mic />} {isMicMuted ? "Unmute" : "Mute"}</Button>}
                        <Popover>
                            <PopoverTrigger asChild><Button variant="outline" className="w-full justify-start gap-2"><Users /> Invite</Button></PopoverTrigger>
                            <PopoverContent className="w-[90vw] sm:w-80">
                                <div className="space-y-2"><h4 className="font-medium">Invite friends</h4><p className="text-sm text-muted-foreground">Share this link to invite others.</p></div>
                                <div className="flex items-center gap-2 mt-2"><Input value={inviteLink} readOnly /><Button variant="outline" size="icon" onClick={handleCopyInvite}><Copy className="h-4 w-4" /></Button></div>
                            </PopoverContent>
                        </Popover>
                        
                        <RecommendationsModal><Button variant="outline" className="w-full justify-start gap-2"><Wand2 /> AI Recs</Button></RecommendationsModal>
                        <Button variant="outline" className="w-full justify-start gap-2" onClick={toggleFullscreen}>{isFullscreen ? <Minimize /> : <Maximize />} {isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}</Button>
                        
                        <div className="col-span-full pt-2">
                           <Button variant="destructive" className="w-full justify-center gap-2" onClick={handleExitRoom}>
                               <LogOut /> Exit Room
                           </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
    
    if (isFullscreen && isMobile) {
        return (
             <div ref={pageRef} className="relative h-svh w-svw bg-black">
                 {activeSharer ? (
                    <LiveKitStage sharerId={activeSharer}/>
                 ) : (
                    <VideoPlayer 
                        ref={videoPlayerRef}
                        videoSource={videoSource}
                        playbackState={playbackState}
                        onPlaybackChange={handlePlaybackChange}
                        user={user}
                        isHost={isHost}
                        onStatusChange={setPlayerStatus}
                    />
                 )}
                 {(videoSource || activeSharer) && (
                   <div className="absolute inset-0 pointer-events-none">
                       <EmojiBar sessionId={sessionId} user={user} isHost={isHost} onSync={handleSyncToHostClick} />
                       <FloatingMessages sessionId={sessionId} user={user} />
                       <FloatingEmojis sessionId={sessionId} />
                   </div>
                 )}
            </div>
        )
    }

    return (
        <div ref={pageRef} className="flex flex-col h-screen bg-background text-foreground">
            <header className="relative flex items-center justify-between px-2 sm:px-4 py-2 border-b z-50">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl font-headline hidden sm:inline">SyncStream</span>
                </Link>

                {renderDesktopControls()}
                {renderMobileControls()}
            </header>
            <main className={cn(
                "flex-1 flex flex-col md:grid md:grid-rows-[minmax(0,1fr)] gap-4 overflow-hidden p-2 md:p-4",
                isSidebarOpen
                    ? "md:grid-cols-[1fr_350px] lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px]"
                    : "md:grid-cols-1"
            )}>
                <div className={cn(
                    "relative md:col-start-1 md:row-start-1 w-full flex-shrink-0 md:flex-shrink md:h-full min-h-0",
                    !isMobile && "aspect-video md:aspect-auto"
                )}>
                   {activeSharer ? (
                        <LiveKitStage sharerId={activeSharer}/>
                   ) : (
                        <VideoPlayer 
                            ref={videoPlayerRef}
                            videoSource={videoSource}
                            playbackState={playbackState}
                            onPlaybackChange={handlePlaybackChange}
                            user={user}
                            isHost={isHost}
                            onStatusChange={setPlayerStatus}
                        />
                   )}
                   {(videoSource || activeSharer) && (
                       <div className="absolute inset-0 pointer-events-none">
                           <EmojiBar sessionId={sessionId} user={user} isHost={isHost} onSync={handleSyncToHostClick} />
                           <FloatingMessages sessionId={sessionId} user={user} />
                           <FloatingEmojis sessionId={sessionId} />
                       </div>
                   )}
                </div>
                <div className={cn(
                    "flex-col md:col-start-2 md:row-start-1 w-full flex-1 md:h-full min-h-0",
                    isSidebarOpen ? "hidden md:flex" : "hidden"
                )}>
                    <Sidebar sessionId={sessionId} user={user} hostId={hostId} />
                </div>
            </main>

            {/* Mobile Sidebar - triggered from the mobile menu */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                <SheetContent side="right" className="p-0 w-full max-w-xs flex flex-col" container={pageRef.current}>
                    <SheetHeaderComponent className="p-4 border-b flex-shrink-0">
                      <SheetTitleComponent>Chat and Participants</SheetTitleComponent>
                    </SheetHeaderComponent>
                    <MobileSidebar sessionId={sessionId} user={user} hostId={hostId} />
                </SheetContent>
            </Sheet>

            <Dialog open={isHostPromptOpen} onOpenChange={setIsHostPromptOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Host Control</DialogTitle>
                        <DialogDescription>
                           Enter the room password to claim or abdicate the host role.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="host-password">Password</Label>
                        <Input
                            id="host-password"
                            type="password"
                            value={hostPassword}
                            onChange={(e) => setHostPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleClaimHost()}
                            disabled={isClaimingHost}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsHostPromptOpen(false)}>Cancel</Button>
                        <Button onClick={handleClaimHost} disabled={isClaimingHost}>
                            {isClaimingHost ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />} Confirm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isSetVideoDialogOpen} onOpenChange={setIsSetVideoDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Set Video</DialogTitle>
                        <DialogDescription>
                           Paste a video link. Direct links and URLs from services like YouTube or Vimeo work best.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="video-url-input" className="sr-only">Video URL</Label>
                        <Input
                            id="video-url-input"
                            value={tempUrl}
                            onChange={(e) => setTempUrl(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSetVideo()}
                            disabled={isPending}
                            placeholder="https://..."
                        />
                        {urlError && <p className="text-xs text-destructive pt-1">{urlError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSetVideoDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSetVideo} disabled={isPending || !tempUrl.trim()}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Load"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
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

    const [sessionDetails, setSessionDetails] = useState<{ hasPassword: boolean; hostId: string | null; activeSharer: string | null; videoSource: ProcessVideoUrlOutput | null; playbackState: PlaybackState; } | null>(null);
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
                    initialHostId={sessionDetails.hostId}
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
