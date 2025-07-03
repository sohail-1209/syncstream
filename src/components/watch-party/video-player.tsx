
'use client';

import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle, ScreenShare } from "lucide-react";
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
    if (videoRef.current) {
        if (screenStream && videoRef.current.srcObject !== screenStream) {
            videoRef.current.srcObject = screenStream;
        } else if (!screenStream && videoRef.current.srcObject) {
            videoRef.current.srcObject = null;
        }
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
        "Could not play the content. The provider may be blocking it (CORS policy). The most reliable solution is to use Screen Sharing.",
      variant: "destructive",
      duration: 8000,
    });
  };

  const renderContent = () => {
    if (!isMounted) {
      return null;
    }

    if (screenStream) {
      return <video key={screenStream.id} ref={videoRef} className="w-full h-full object-contain" autoPlay muted playsInline />;
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
    
    // Default placeholder states
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
  };
  
  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {renderContent()}
      </div>
    </Card>
  );
}
