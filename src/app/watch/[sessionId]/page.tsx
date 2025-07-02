'use client';

import { useParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import VideoPlayer from "@/components/watch-party/video-player";
import Sidebar from "@/components/watch-party/sidebar";
import RecommendationsModal from "@/components/watch-party/recommendations-modal";
import { Copy, Users, Wand2, Link as LinkIcon, Loader2, ScreenShare } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import { processAndGetVideoUrl } from "@/app/actions";

export default function WatchPartyPage() {
    const params = useParams<{ sessionId: string }>();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [inviteLink, setInviteLink] = useState('');
    const [videoSource, setVideoSource] = useState<ProcessVideoUrlOutput | null>(null);
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
    const [tempUrl, setTempUrl] = useState('');
    const [isVideoPopoverOpen, setIsVideoPopoverOpen] = useState(false);
    const [urlError, setUrlError] = useState<string | null>(null);


    useEffect(() => {
        if (typeof window !== 'undefined') {
            setInviteLink(`${window.location.origin}/watch/${params.sessionId}`);
        }
    }, [params.sessionId]);

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
            setVideoSource(null); // Prioritize screen share over URL
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

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            <header className="flex items-center justify-between px-4 py-2 border-b">
                <Link href="/" className="flex items-center gap-2">
                    <Logo className="h-8 w-8 text-primary" />
                    <span className="font-bold text-xl font-headline hidden sm:inline">SyncStream</span>
                </Link>
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
                </div>
            </header>
            <main className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_350px] lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_450px] gap-4 p-4 overflow-hidden">
                <div className="md:col-start-1 md:row-start-1 w-full flex-shrink-0 md:flex-shrink aspect-video md:aspect-auto md:h-full min-h-0">
                    <VideoPlayer videoSource={videoSource} screenStream={screenStream} />
                </div>
                <div className="md:col-start-2 md:row-start-1 w-full flex-1 md:h-full min-h-0">
                    <Sidebar />
                </div>
            </main>
        </div>
    );
}
