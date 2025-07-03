'use client';

import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle, Maximize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import ReactPlayer from 'react-player';
import { Button } from "@/components/ui/button";

export default function VideoPlayer({ 
  videoSource,
}: { 
  videoSource: ProcessVideoUrlOutput | null;
}) {
  const { toast } = useToast();
  const [urlError, setUrlError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset error state when a new URL source is provided
  useEffect(() => {
    setUrlError(false);
  }, [videoSource]);

  const handleUrlError = () => {
    setUrlError(true);
    toast({
      title: "Video Error",
      description:
        "Could not play the content. The provider may be blocking it (CORS policy). The most reliable solution is to use Screen Sharing.",
      variant: "destructive",
      duration: 8000,
    });
  };

  const handleFullscreen = () => {
    if (playerRef.current) {
        // The type assertion is needed because the TS definitions for vendor prefixes are not standard
        const element = playerRef.current as any;
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) { /* Firefox */
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { /* Chrome, Safari & Opera */
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { /* IE/Edge */
            element.msRequestFullscreen();
        }
    }
  };

  const renderPlaceholder = () => {
    let Icon = Film;
    let title = "No Video Loaded";
    let description = 'Use the "Set Video" or "Share Screen" buttons to start.';

    if (urlError) {
      Icon = AlertTriangle;
      title = "Video Playback Error";
      description = "The provider is blocking playback here. Try using the 'Share Screen' feature instead.";
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground bg-black/50 p-4">
        <Icon className={`h-16 w-16 mb-4 ${urlError ? 'text-destructive' : ''}`} />
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-lg max-w-xl">{description}</p>
      </div>
    );
  }
  
  return (
    <Card ref={playerRef} className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {isMounted && videoSource && !urlError ? (
          <>
            <ReactPlayer
              key={videoSource.correctedUrl}
              url={videoSource.correctedUrl}
              playing
              controls
              width="100%"
              height="100%"
              onError={handleUrlError}
              config={{
                file: {
                  attributes: {
                    crossOrigin: 'anonymous'
                  }
                }
              }}
            />
            <EmojiBar />
          </>
        ) : (
           renderPlaceholder()
        )}
        <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-white hover:bg-white/20 hover:text-white z-30 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleFullscreen}
            aria-label="Go Fullscreen"
        >
            <Maximize className="h-6 w-6" />
            <span className="sr-only">Go Fullscreen</span>
        </Button>
      </div>
    </Card>
  );
}
