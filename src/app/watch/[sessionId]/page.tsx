'use client';

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/icons";
import VideoPlayer from "@/components/watch-party/video-player";
import Sidebar from "@/components/watch-party/sidebar";
import RecommendationsModal from "@/components/watch-party/recommendations-modal";
import { Copy, Users, Wand2 } from "lucide-react";
import Link from 'next/link';

export default function WatchPartyPage() {
    const params = useParams<{ sessionId: string }>();
    const inviteLink = `https://example.com/watch/${params.sessionId}`;

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
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigator.clipboard.writeText(inviteLink)}>
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </header>
            <main className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_350px] lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 overflow-hidden">
                <div className="md:col-span-1 lg:col-span-2 xl:col-span-3 w-full h-full min-h-0">
                    <VideoPlayer />
                </div>
                <div className="md:col-span-1 lg:col-span-1 xl:col-span-1 w-full h-full min-h-0">
                    <Sidebar />
                </div>
            </main>
        </div>
    );
}
