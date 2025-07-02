'use client';

import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import ReactPlayer from 'react-player/lazy';

export default function VideoPlayer({ videoSource }: { videoSource: ProcessVideoUrlOutput | null }) {
  const { toast } = useToast();
  const [hasError, setHasError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Reset error state when a new video source is provided
    setHasError(false);
  }, [videoSource]);

  const handleError = () => {
    setHasError(true);
    toast({
      title: "Video Error",
      description:
        "Could not play the video. The link may be invalid, the content removed, or the provider is blocking it from being embedded (CORS policy).",
      variant: "destructive",
      duration: 8000,
    });
  };
  
  const videoUrl = videoSource?.correctedUrl;

  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {isMounted && videoUrl && !hasError ? (
          <>
            <ReactPlayer
              key={videoUrl}
              url={videoUrl}
              playing
              controls
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
            <EmojiBar />
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
                    <p className="text-lg">Use the "Set Video" button to load a video.</p>
                </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
