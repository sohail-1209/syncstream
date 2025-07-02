'use client';

import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";

export default function VideoPlayer({ videoSource }: { videoSource: ProcessVideoUrlOutput | null }) {
  const { toast } = useToast();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset error state when a new video source is provided
    setHasError(false);
  }, [videoSource]);

  const handleError = () => {
    // This error handler is mainly for the <video> tag
    setHasError(true);
    toast({
      title: "Video Error",
      description:
        "Could not play the video. Please check the link and ensure it allows embedding.",
      variant: "destructive",
      duration: 8000,
    });
  };
  
  const renderVideo = () => {
    if (!videoSource) return null;

    switch (videoSource.platform) {
        case 'youtube':
            return (
                <iframe
                    key={videoSource.videoId}
                    className="w-full h-full"
                    src={`https://www.youtube.com/embed/${videoSource.videoId}?autoplay=1&controls=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                ></iframe>
            );
        case 'vimeo':
            return (
                <iframe
                    key={videoSource.videoId}
                    className="w-full h-full"
                    src={`https://player.vimeo.com/video/${videoSource.videoId}?autoplay=1`}
                    title="Vimeo video player"
                    frameBorder="0"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                ></iframe>
            );
        case 'direct':
            return (
                 <video
                    key={videoSource.correctedUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    src={videoSource.correctedUrl}
                    onError={handleError}
                    crossOrigin="anonymous"
                >
                    Your browser does not support the video tag.
                </video>
            );
        default:
            return null;
    }
  }
  
  const videoElement = renderVideo();

  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {videoElement && !hasError ? (
          <>
            {videoElement}
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
