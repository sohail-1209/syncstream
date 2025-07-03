
'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef } from "react";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import ReactPlayer from 'react-player';
import type { LocalUser } from "@/hooks/use-local-user";
import type { Timestamp } from "firebase/firestore";

type PlaybackState = {
  isPlaying: boolean;
  seekTime: number;
  updatedBy: string;
  timestamp: Timestamp;
} | null;

export default function VideoPlayer({ 
  videoSource,
  playbackState,
  onPlaybackChange,
  user
}: { 
  videoSource: ProcessVideoUrlOutput | null;
  playbackState: PlaybackState;
  onPlaybackChange: (newState: { isPlaying: boolean, seekTime: number }) => void;
  user: LocalUser | null;
}) {
  const { toast } = useToast();
  const playerRef = useRef<ReactPlayer>(null);

  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [urlError, setUrlError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPlaceholderFullscreen, setIsPlaceholderFullscreen] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // When video source changes, reset states
    setUrlError(false);
    setIsReady(false);
    if (playbackState) {
        setLocalIsPlaying(playbackState.isPlaying);
    } else {
        setLocalIsPlaying(false);
    }
  }, [videoSource, playbackState]);


  // Sync remote state to local player
  useEffect(() => {
    if (!playbackState || !isReady || !playerRef.current || !user) {
        return;
    }

    // If the state was updated by the current user, ignore it to prevent loops
    if (playbackState.updatedBy === user.id) {
        return;
    }
    
    // Sync playing status
    if (localIsPlaying !== playbackState.isPlaying) {
        setLocalIsPlaying(playbackState.isPlaying);
    }

    // Sync seek time, with a tolerance to prevent seeking on minor differences
    const localTime = playerRef.current.getCurrentTime() || 0;
    if (Math.abs(localTime - playbackState.seekTime) > 2) { 
        playerRef.current.seekTo(playbackState.seekTime, 'seconds');
    }

  }, [playbackState, isReady, user, localIsPlaying]);


  const handleReady = () => {
    setIsReady(true);
    // When a new video is loaded, seek to the last known position
    if (playbackState && playerRef.current) {
        playerRef.current.seekTo(playbackState.seekTime, 'seconds');
        setLocalIsPlaying(playbackState.isPlaying);
    }
  };

  const handlePlay = () => {
    if (!localIsPlaying) {
      setLocalIsPlaying(true);
      onPlaybackChange({ isPlaying: true, seekTime: playerRef.current?.getCurrentTime() || 0 });
    }
  };

  const handlePause = () => {
    if (localIsPlaying) {
      setLocalIsPlaying(false);
      onPlaybackChange({ isPlaying: false, seekTime: playerRef.current?.getCurrentTime() || 0 });
    }
  };

  const handleSeek = (seconds: number) => {
    // This is fired when user drags the progress bar.
    // We update our local state to feel instant, then broadcast.
    setLocalIsPlaying(localIsPlaying); // to be sure
    playerRef.current?.seekTo(seconds, 'seconds');
    onPlaybackChange({ isPlaying: localIsPlaying, seekTime: seconds });
  };
  
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
      <div ref={placeholderRef} className="w-full h-full bg-black/50 flex flex-col">
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
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
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
              ref={playerRef}
              key={videoSource.correctedUrl}
              url={videoSource.correctedUrl}
              playing={localIsPlaying}
              controls
              width="100%"
              height="100%"
              onReady={handleReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
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
