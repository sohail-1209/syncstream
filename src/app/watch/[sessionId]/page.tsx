'use client';

import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import VideoPlayer from "@/components/watch-party/video-player";
import Sidebar from "@/components/watch-party/sidebar";
import RecommendationsModal from "@/components/watch-party/recommendations-modal";
import { Copy, Users, Wand2, Link as LinkIcon } from "lucide-react";
import Link from 'next/link';
import { useToast } from "@/hooks/use-toast";

export default function WatchPartyPage() {
    const params = useParams<{ sessionId: string }>();
    const { toast } = useToast();
    const [inviteLink, setInviteLink] = useState('');
    const [videoUrl, setVideoUrl] = useState('');
    const [tempUrl, setTempUrl] = useState('');
    const [isVideoPopoverOpen, setIsVideoPopoverOpen] = useState(false);

    useState(() => {
        if (typeof window !== 'undefined') {
            setInviteLink(`${window.location.origin}/watch/${params.sessionId}`);
        }
    });

    const handleSetVideo = () => {
        // The VideoPlayer component will handle URL validation and type
        setVideoUrl(tempUrl);
        setIsVideoPopoverOpen(false);
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
                                        Paste a YouTube or direct video link (e.g., .mp4).
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Input
                                        placeholder="https://youtube.com/watch?v=..."
                                        value={tempUrl}
                                        onChange={(e) => setTempUrl(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSetVideo()}
                                        className="h-8"
                                    />
                                    <Button onClick={handleSetVideo} size="sm" className="h-8">Load</Button>
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
                                        Share this link with others to join the party.
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
                    <VideoPlayer videoUrl={videoUrl} />
                </div>
                <div className="md:col-start-2 md:row-start-1 w-full flex-1 md:h-full min-h-0">
                    <Sidebar />
                </div>
            </main>
        </div>
    );
}