
'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import EmojiBar from "./emoji-bar";
import { Film, AlertTriangle, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, useCallback } from "react";
import type { ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import ReactPlayer from 'react-player';
import type { LocalUser } from "@/hooks/use-local-user";
import { type OnProgressProps } from "react-player/base";

type PlaybackState = {
  isPlaying: boolean;
  seekTime: number;
  updatedBy: string;
  timestamp: number;
} | null;

export default function VideoPlayer({ 
  videoSource,
  playbackState,
  onPlaybackChange,
  user,
  isHost
}: { 
  videoSource: ProcessVideoUrlOutput | null;
  playbackState: PlaybackState;
  onPlaybackChange: (newState: { isPlaying: boolean, seekTime: number }) => void;
  user: LocalUser | null;
  isHost: boolean;
}) {
  const { toast } = useToast();
  const playerRef = useRef<ReactPlayer>(null);
  const syncState = useRef<{ isSeeking: boolean, seekTo: number | null }>({ isSeeking: false, seekTo: null });

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
    setUrlError(false);
    setIsReady(false);
    syncState.current = { isSeeking: false, seekTo: null };
    if (playbackState) {
        setLocalIsPlaying(playbackState.isPlaying);
    } else {
        setLocalIsPlaying(false);
    }
  }, [videoSource]);

  // Sync remote state to local player
  useEffect(() => {
    if (!playbackState || !isReady || !playerRef.current || !user) {
        return;
    }

    if (playbackState.updatedBy === user.id) {
        return;
    }
    
    if (localIsPlaying !== playbackState.isPlaying) {
        setLocalIsPlaying(playbackState.isPlaying);
    }

    const localTime = playerRef.current.getCurrentTime() || 0;
    const remoteTime = typeof playbackState.seekTime === 'number' ? playbackState.seekTime : 0;
    
    // Generous threshold to prevent sync-fights during normal playback
    if (Math.abs(localTime - remoteTime) > 1.5) { 
        if (!syncState.current.isSeeking) {
            syncState.current = { isSeeking: true, seekTo: remoteTime };
            playerRef.current.seekTo(remoteTime, 'seconds');
        }
    }

  }, [playbackState, isReady, user, localIsPlaying]);


  const handleReady = useCallback(() => {
    setIsReady(true);
    if (playbackState && playerRef.current) {
        syncState.current = { isSeeking: true, seekTo: playbackState.seekTime };
        playerRef.current.seekTo(playbackState.seekTime, 'seconds');
        setLocalIsPlaying(playbackState.isPlaying);
    }
  }, [playbackState]);

  const handlePlay = useCallback(() => {
    if (!isHost) return;
    if (!localIsPlaying) {
      setLocalIsPlaying(true);
      if (user?.id) {
        onPlaybackChange({ isPlaying: true, seekTime: playerRef.current?.getCurrentTime() || 0 });
      }
    }
  }, [localIsPlaying, onPlaybackChange, user?.id, isHost]);

  const handlePause = useCallback(() => {
    if (!isHost) return;
    if (localIsPlaying) {
      setLocalIsPlaying(false);
      if (user?.id) {
        onPlaybackChange({ isPlaying: false, seekTime: playerRef.current?.getCurrentTime() || 0 });
      }
    }
  }, [localIsPlaying, onPlaybackChange, user?.id, isHost]);

  const handleSeek = useCallback((seconds: number) => {
    if (!isHost) return;
    if (syncState.current.isSeeking) {
        return;
    }
    if (user?.id) {
        onPlaybackChange({ isPlaying: localIsPlaying, seekTime: seconds });
    }
  }, [localIsPlaying, onPlaybackChange, user?.id, isHost]);
  
  const handleProgress = useCallback((progress: OnProgressProps) => {
    if (syncState.current.isSeeking && syncState.current.seekTo !== null) {
      if (Math.abs(progress.playedSeconds - syncState.current.seekTo) < 0.5) {
        syncState.current = { isSeeking: false, seekTo: null };
      }
    }
  }, []);

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
    <Card className="w-full h-full bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {isMounted && videoSource && !urlError ? (
          <>
            <ReactPlayer
              ref={playerRef}
              key={videoSource.correctedUrl}
              url={videoSource.correctedUrl}
              playing={localIsPlaying}
              controls={isHost}
              width="100%"
              height="100%"
              onReady={handleReady}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
              onProgress={handleProgress}
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

    