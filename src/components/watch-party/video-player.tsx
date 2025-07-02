'use client';

import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
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
  const [hasError, setHasError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const activeSource = screenStream || videoSource?.correctedUrl || null;
  const sourceKey = screenStream ? screenStream.id : videoSource?.correctedUrl;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Reset error state when a new source is provided
    setHasError(false);
  }, [sourceKey]);

  const handleError = () => {
    setHasError(true);
    toast({
      title: "Video Error",
      description:
        "Could not play the content. It may be an invalid link, private, removed, or the provider could be blocking it (CORS policy).",
      variant: "destructive",
      duration: 8000,
    });
  };
  
  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {isMounted && activeSource && !hasError ? (
          <>
            <ReactPlayer
              key={sourceKey}
              url={activeSource}
              playing
              controls
              muted={!!screenStream} // Mute screen share audio by default to prevent feedback
              width="100%"
              height="100%"
              onError={handleError}
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
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center text-muted-foreground bg-black/50 p-4">
            {hasError ? (
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
        )}
      </div>
    </Card>
  );
}
