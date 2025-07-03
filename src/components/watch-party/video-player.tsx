
'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import ReactPlayer from 'react-player';

export default function VideoPlayer({ 
  videoSource,
}: { 
  videoSource: ProcessVideoUrlOutput | null;
}) {
  const { toast } = useToast();
  const [urlError, setUrlError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPlaceholderFullscreen, setIsPlaceholderFullscreen] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setUrlError(false);
  }, [videoSource]);

  useEffect(() => {
    const handleFullscreenChange = () => {
        if (document.fullscreenElement === placeholderRef.current) {
            setIsPlaceholderFullscreen(true);
        } else if (isPlaceholderFullscreen) {
            setIsPlaceholderFullscreen(false);
        }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isPlaceholderFullscreen]);

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
      <div ref={placeholderRef} className="relative w-full h-full bg-black/50">
        <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 text-white hover:text-white hover:bg-white/10 z-50"
            onClick={togglePlaceholderFullscreen}
            aria-label={isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
        >
            {isPlaceholderFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
            <span className="sr-only">{isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}</span>
        </Button>
        <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
            <Icon className={`h-16 w-16 mb-4 ${urlError ? 'text-destructive' : ''}`} />
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-lg max-w-xl">{description}</p>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
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
      </div>
    </Card>
  );
}
