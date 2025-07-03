
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { ScreenShare, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveKitStage({ sharerId }: { sharerId: string }) {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  const { toast } = useToast();
  const [isPlaceholderFullscreen, setIsPlaceholderFullscreen] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsPlaceholderFullscreen(document.fullscreenElement === placeholderRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const togglePlaceholderFullscreen = () => {
      if (!placeholderRef.current) return;
      if (!document.fullscreenElement) {
          placeholderRef.current.requestFullscreen().catch(err => {
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


  if (tracks.length === 0) {
    return (
      <Card 
        ref={placeholderRef} 
        className="w-full h-full bg-card flex flex-col text-muted-foreground bg-black/50"
      >
        <div className="w-full flex justify-end p-2">
            <Button
                variant="ghost"
                size="icon"
                className="relative z-50 h-10 w-10 text-white hover:text-white hover:bg-white/10"
                onClick={togglePlaceholderFullscreen}
                aria-label={isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
            >
                {isPlaceholderFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                <span className="sr-only">{isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}</span>
            </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 -mt-14">
            <ScreenShare className="h-16 w-16 mb-4" />
            <h2 className="text-2xl font-bold">Waiting for screen share...</h2>
            <p className="text-lg">The host has not started sharing their screen yet.</p>
        </div>
      </Card>
    );
  }

  return (
     <VideoTrack
        trackRef={tracks[0]}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
     />
  );
}