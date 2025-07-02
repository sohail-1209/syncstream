'use client';

import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

export default function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  const { toast } = useToast();
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [videoUrl]);

  const handleError = () => {
    setHasError(true);
    toast({
      title: "Video Error",
      description:
        "Could not play the video. Please check the link and ensure it's a direct link to a video file (e.g., .mp4) and allows embedding.",
      variant: "destructive",
      duration: 8000,
    });
  };

  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {videoUrl && !hasError ? (
          <>
            <video
              key={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              src={videoUrl}
              onError={handleError}
              crossOrigin="anonymous"
            >
              Your browser does not support the video tag.
            </video>
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
