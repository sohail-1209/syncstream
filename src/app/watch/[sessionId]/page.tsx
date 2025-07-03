
'use client';

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import VideoPlayer from "@/components/watch-party/video-player";
import Sidebar from "@/components/watch-party/sidebar";
import RecommendationsModal from "@/components/watch-party/recommendations-modal";
import { Copy, Users, Wand2, Link as LinkIcon, Loader2, ScreenShare, LogOut, ArrowRight, Eye } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import { processAndGetVideoUrl, getSessionDetails, verifyPassword, getSessionPassword, setBroadcaster } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { useLocalUser } from "@/hooks/use-local-user";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp, collection, onSnapshot, addDoc, deleteDoc, getDoc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

type AuthStatus = 'checking' | 'prompt_password' | 'authenticated' | 'error';

const rtcConfig = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function WatchPartyPage() {
    const params = useParams<{ sessionId: string }>();
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [inviteLink, setInviteLink] = useState('');
    const [videoSource, setVideoSource] = useState<ProcessVideoUrlOutput | null>(null);
    const [tempUrl, setTempUrl] = useState('');
    const [isVideoPopoverOpen, setIsVideoPopoverOpen] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);
    const localUser = useLocalUser();

    // Auth state
    const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
    const [authError, setAuthError] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [isVerifying, startVerifyTransition] = useTransition();
    const [hasPassword, setHasPassword] = useState(false);
    const [sessionPassword, setSessionPassword] = useState<string | null>(null);
    const [isFetchingPassword, startFetchPasswordTransition] = useTransition();

    // WebRTC state
    const [broadcasterId, setBroadcasterId] = useState<string | null>(null);
    const [localScreenStream, setLocalScreenStream] =useState<MediaStream | null>(null);
    const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const candidateQueue = useRef<RTCIceCandidate[]>([]);


    useEffect(() => {
        const checkSession = async () => {
            const result = await getSessionDetails(params.sessionId);
            if (result.error) {
                setAuthError(result.error);
                setAuthStatus('error');
            } else if (result.data) {
                setHasPassword(result.data.hasPassword);
                setBroadcasterId(result.data.broadcasterId);
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


    // Listen for broadcaster changes
    useEffect(() => {
        if (authStatus !== 'authenticated') return;
        const sessionRef = doc(db, 'sessions', params.sessionId);
        const unsub = onSnapshot(sessionRef, (doc) => {
            const newBroadcasterId = doc.data()?.broadcasterId ?? null;
            if (newBroadcasterId !== broadcasterId) {
                setBroadcasterId(newBroadcasterId);
            }
        });
        return () => unsub();
    }, [params.sessionId, authStatus, broadcasterId]);


    // Main WebRTC Logic
    useEffect(() => {
        if (authStatus !== 'authenticated' || !localUser) return;
    
        if (localUser.id === broadcasterId && !localScreenStream) {
            setBroadcaster(params.sessionId, null);
            return;
        }

        const cleanupConnections = () => {
            Object.values(peerConnections.current).forEach(pc => pc.close());
            peerConnections.current = {};
            setRemoteScreenStream(null);
        };
    
        if (!broadcasterId) {
            cleanupConnections();
            if (localScreenStream) {
                localScreenStream.getTracks().forEach(track => track.stop());
                setLocalScreenStream(null);
            }
            return;
        }

        const unsubscribers: (() => void)[] = [];
    
        if (localUser.id === broadcasterId) {
            const offersRef = collection(db, `sessions/${params.sessionId}/offers`);
            const unsubOffers = onSnapshot(offersRef, (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const viewerId = change.doc.id;
                        const offer = change.doc.data();

                        if (peerConnections.current[viewerId]) {
                             peerConnections.current[viewerId].close();
                        }

                        const pc = new RTCPeerConnection(rtcConfig);
                        peerConnections.current[viewerId] = pc;

                        localScreenStream?.getTracks().forEach(track => {
                             if(localScreenStream) pc.addTrack(track, localScreenStream);
                        });

                        pc.onicecandidate = e => {
                            if (e.candidate) {
                                addDoc(collection(db, `sessions/${params.sessionId}/iceCandidates`), { from: localUser.id, to: viewerId, candidate: e.candidate.toJSON() });
                            }
                        };
                        
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription(offer));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            await setDoc(doc(db, `sessions/${params.sessionId}/answers`, viewerId), { from: localUser.id, answer: answer });
                        } catch (e) { console.error("Error handling offer: ", e); }
                        
                        await deleteDoc(change.doc.ref);
                    }
                });
            });
            unsubscribers.push(unsubOffers);

            const candidatesQuery = query(collection(db, `sessions/${params.sessionId}/iceCandidates`), where("to", "==", localUser.id));
            const unsubCandidates = onSnapshot(candidatesQuery, (snapshot) => {
                snapshot.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        const pc = peerConnections.current[data.from];
                        if (pc && pc.remoteDescription) {
                            try {
                                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
                            } catch (e) { console.error("Error adding ICE candidate: ", e); }
                        }
                        await deleteDoc(change.doc.ref);
                    }
                });
            });
            unsubscribers.push(unsubCandidates);

            const participantsRef = collection(db, `sessions/${params.sessionId}/participants`);
            const unsubParticipants = onSnapshot(participantsRef, (snapshot) => {
                const currentParticipants = new Set(snapshot.docs.map(d => d.id));
                Object.keys(peerConnections.current).forEach(peerId => {
                    if (!currentParticipants.has(peerId)) {
                        peerConnections.current[peerId].close();
                        delete peerConnections.current[peerId];
                    }
                });
            });
            unsubscribers.push(unsubParticipants);

            return () => {
                unsubscribers.forEach(unsub => unsub());
            }
        } 
        else {
            const pc = new RTCPeerConnection(rtcConfig);
            peerConnections.current[broadcasterId] = pc;
    
            pc.onicecandidate = e => {
                if(e.candidate) {
                    addDoc(collection(db, `sessions/${params.sessionId}/iceCandidates`), { from: localUser.id, to: broadcasterId, candidate: e.candidate.toJSON() })
                }
            };
            
            pc.ontrack = (event) => setRemoteScreenStream(event.streams[0]);
    
            const createOffer = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await setDoc(doc(db, `sessions/${params.sessionId}/offers`, localUser.id), offer);
                } catch (e) { console.error("Error creating offer:", e); }
            };
            createOffer();
    
            const answerRef = doc(db, `sessions/${params.sessionId}/answers`, localUser.id);
            const unsubAnswer = onSnapshot(answerRef, async (docSnap) => {
                if (docSnap.exists() && docSnap.data().from === broadcasterId && !pc.currentRemoteDescription) {
                    try {
                        await pc.setRemoteDescription(new RTCSessionDescription(docSnap.data().answer));
                        candidateQueue.current.forEach(candidate => pc.addIceCandidate(candidate));
                        candidateQueue.current = [];
                    } catch(e) { console.error("Error setting remote description from answer:", e); }
                    await deleteDoc(docSnap.ref);
                }
            });

            const candidatesQuery = query(collection(db, `sessions/${params.sessionId}/iceCandidates`), where("to", "==", localUser.id), where("from", "==", broadcasterId));
            const unsubCandidates = onSnapshot(candidatesQuery, (snap) => {
                snap.docChanges().forEach(async (change) => {
                    if (change.type === 'added') {
                        const candidate = new RTCIceCandidate(change.doc.data().candidate);
                        try {
                            if (pc.remoteDescription) {
                                await pc.addIceCandidate(candidate);
                            } else {
                                candidateQueue.current.push(candidate);
                            }
                        } catch(e) { console.error("Error adding ICE candidate:", e); }
                        await deleteDoc(change.doc.ref);
                    }
                });
            });

             return () => {
                unsubAnswer();
                unsubCandidates();
                cleanupConnections();
            }
        }
    }, [broadcasterId, localUser, authStatus, params.sessionId, localScreenStream]);


    const handleSetVideo = () => {
        if (broadcasterId) {
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
            // --- Logic to STOP screen sharing ---
            if (broadcasterId && broadcasterId === localUser?.id) {
                const result = await setBroadcaster(params.sessionId, null);
                if (result.error) {
                    toast({ variant: 'destructive', title: 'Error', description: 'Failed to stop sharing.' });
                } else {
                    // Optimistic update
                    setBroadcasterId(null);
                    toast({ title: "Screen Sharing Stopped" });
                }
                return;
            }

            // --- Prevent another user from starting a share ---
            if (broadcasterId && broadcasterId !== localUser?.id) {
                toast({ variant: 'destructive', title: 'Action not allowed', description: 'Another user is already sharing their screen.' });
                return;
            }

            // --- Logic to START screen sharing ---
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: { echoCancellation: true, noiseSuppression: true } });
            
            // This handles when the user clicks the browser's native "Stop sharing" button
            const onStreamEnd = async () => {
                stream.getVideoTracks()[0].removeEventListener('ended', onStreamEnd);
                const sessionDoc = await getDoc(doc(db, 'sessions', params.sessionId));
                // Only act if we are still the broadcaster
                if (sessionDoc.data()?.broadcasterId === localUser?.id) {
                    await setBroadcaster(params.sessionId, null);
                }
            };
            stream.getVideoTracks()[0].addEventListener('ended', onStreamEnd);
            
            setVideoSource(null);
            setLocalScreenStream(stream);
            
            // Set this user as the broadcaster in the database
            const result = await setBroadcaster(params.sessionId, localUser!.id);

            if (result.error) {
                // If the database update fails, stop everything
                stream.getTracks().forEach(track => track.stop());
                setLocalScreenStream(null);
                toast({
                    variant: 'destructive',
                    title: 'Failed to start sharing',
                    description: result.error,
                });
            } else {
                // Optimistically update the local state immediately
                setBroadcasterId(localUser!.id);
                toast({
                    title: "Screen Sharing Started",
                    description: "You are now sharing your screen.",
                });
            }

        } catch (error) {
            if ((error as DOMException).name !== 'NotAllowedError') {
              console.error("Screen share error:", error);
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

    const handleExitRoom = async () => {
        if (broadcasterId === localUser?.id) {
            await setBroadcaster(params.sessionId, null);
        }
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
    
    const handleFetchPassword = () => {
        if (!params.sessionId) return;
        startFetchPasswordTransition(async () => {
            const result = await getSessionPassword(params.sessionId);
            if (result.error) {
                setSessionPassword('Error');
                toast({ variant: 'destructive', title: 'Error', description: result.error });
            } else if (result.data) {
                setSessionPassword(result.data.password ?? 'No Password');
            }
        });
    };

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
    
    const screenStream = broadcasterId === localUser?.id ? localScreenStream : remoteScreenStream;
    const amBroadcaster = broadcasterId === localUser?.id;

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            <header className="flex items-center justify-between px-4 py-2 border-b">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl font-headline hidden sm:inline">SyncStream</span>
                </Link>

                <div className="hidden md:flex flex-col items-center">
                    <span className="text-xs text-muted-foreground">ROOM CODE</span>
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="text-base font-mono tracking-widest px-3 py-1">{params.sessionId}</Badge>
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
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <RecommendationsModal>
                        <Button variant="outline">
                            <Wand2 className="h-4 w-4 mr-2" />
                            Get AI Recommendations
                        </Button>
                    </RecommendationsModal>

                     <Button variant="outline" onClick={handleShareScreen} disabled={broadcasterId !== null && !amBroadcaster}>
                        <ScreenShare className="h-4 w-4 mr-2" />
                        {amBroadcaster ? 'Stop Sharing' : 'Share Screen'}
                    </Button>

                    <Popover open={isVideoPopoverOpen} onOpenChange={setIsVideoPopoverOpen}>
                        <PopoverTrigger asChild>
                             <Button variant="outline" disabled={!!broadcasterId}>
                                <LinkIcon className="h-4 w-4 mr-2" />
                                Set Video
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
                    <Button variant="outline" onClick={handleExitRoom}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Exit
                    </Button>
                </div>
            </header>
            <main className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_350px] lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-4 p-4 overflow-hidden">
                <div className="md:col-start-1 md:row-start-1 w-full flex-shrink-0 md:flex-shrink aspect-video md:aspect-auto md:h-full min-h-0">
                    <VideoPlayer key={broadcasterId} videoSource={broadcasterId ? null : videoSource} screenStream={screenStream} isBroadcaster={amBroadcaster} />
                </div>
                <div className="md:col-start-2 md:row-start-1 w-full flex-1 md:h-full min-h-0">
                    <Sidebar sessionId={params.sessionId} user={localUser} />
                </div>
            </main>
        </div>
    );
}
