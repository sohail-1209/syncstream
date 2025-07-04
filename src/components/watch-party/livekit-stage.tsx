
'use client';

import { useEffect, useState, useRef } from 'react';
import {
  useTracks,
  VideoTrack,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { ScreenShare, Maximize, Minimize, RefreshCw } from 'lucide-react';
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
  const [isRotated, setIsRotated] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  const handleRotate = async () => {
    if (!placeholderRef.current) return;
    try {
        if (!document.fullscreenElement) {
            await placeholderRef.current.requestFullscreen();
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

  useEffect(() => {
    const handleFullscreenChange = () => {
        if (document.fullscreenElement === placeholderRef.current) {
            setIsPlaceholderFullscreen(true);
        } else {
            setIsPlaceholderFullscreen(false);
            if (isRotated) {
                if (screen.orientation && screen.orientation.unlock) {
                    screen.orientation.unlock();
                }
                setIsRotated(false);
            }
        }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isPlaceholderFullscreen, isRotated]);

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
        className="w-full h-full bg-card flex flex-col text-muted-foreground bg-black/50 relative"
      >
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
            <ScreenShare className="h-12 w-12 md:h-16 md:w-16 mb-4" />
            <h2 className="text-xl md:text-2xl font-bold">Waiting for screen share...</h2>
            <p className="text-base md:text-lg">The host has not started sharing their screen yet.</p>
        </div>
        <div className="absolute bottom-2 right-2 flex gap-2 md:hidden">
             <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white hover:text-white hover:bg-white/20 rounded-full"
                onClick={handleRotate}
                aria-label="Rotate to Landscape"
                title="Rotate to Landscape"
            >
                <RefreshCw className="h-6 w-6" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white hover:text-white hover:bg-white/20 rounded-full"
                onClick={togglePlaceholderFullscreen}
                aria-label={isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                title={isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
            >
                {isPlaceholderFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
            </Button>
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
