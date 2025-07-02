'use client';

import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import ReactPlayer from 'react-player';

export default function VideoPlayer({ 
  videoSource, 
  screenStream 
}: { 
  videoSource: ProcessVideoUrlOutput | null;
  screenStream: MediaStream | null;
}) {
  const { toast } = useToast();
  const [urlError, setUrlError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Reset error state when a new URL source is provided
  useEffect(() => {
    setUrlError(false);
  }, [videoSource]);

  const handleUrlError = () => {
    setUrlError(true);
    toast({
      title: "Video Error",
      description:
        "Could not play the content. It may be an invalid link, private, removed, or the provider could be blocking it (CORS policy).",
      variant: "destructive",
      duration: 8000,
    });
  };

  const renderContent = () => {
    if (!isMounted) {
      return null;
    }

    if (screenStream) {
      return <video ref={videoRef} className="w-full h-full" autoPlay muted playsInline />;
    }

    if (videoSource && !urlError) {
      return (
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
          {!screenStream && <EmojiBar />}
        </>
      );
    }

    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground bg-black/50 p-4">
        {urlError ? (
             <>
                <AlertTriangle className="h-16 w-16 mb-4 text-destructive" />
                <h2 className="text-2xl font-bold">Video Playback Error</h2>
                <p className="text-lg">Could not load video. Check the link and try again.</p>
             </>
        ) : (
            <>
                <Film className="h-16 w-16 mb-4" />
                <h2 className="text-2xl font-bold">No Video Loaded</h2>
                <p className="text-lg">Use the "Set Video" or "Share Screen" buttons to start.</p>
            </>
        )}
      </div>
    );
  };
  
  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {renderContent()}
      </div>
    </Card>
  );
}
