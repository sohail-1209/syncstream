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
  updatedAt: number;
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
  const isSyncing = useRef(false);
  const lastProgressUpdate = useRef(0);
  const lastHostUpdate = useRef(0);

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
  }, [videoSource]);

  // Sync remote state to local player
  useEffect(() => {
    if (!playbackState || !isReady || !playerRef.current || !user || !isMounted) {
      return;
    }
    
    // Ignore stale updates
    if (playbackState.updatedAt < lastHostUpdate.current) {
        return;
    }

    // Ignore updates that we triggered ourselves
    if (playbackState.updatedBy === user.id) {
      return;
    }

    lastHostUpdate.current = playbackState.updatedAt;
    
    // Set a flag to prevent our own event handlers from firing while we sync.
    isSyncing.current = true;

    // --- Sync playing state ---
    if (localIsPlaying !== playbackState.isPlaying) {
      setLocalIsPlaying(playbackState.isPlaying);
    }

    // --- Sync seek time ---
    const localTime = playerRef.current.getCurrentTime() || 0;
    const remoteTime = playbackState.seekTime || 0;

    if (Math.abs(localTime - remoteTime) > 1.5) {
      playerRef.current.seekTo(remoteTime, 'seconds');
    }
    
    const syncTimeout = setTimeout(() => {
      isSyncing.current = false;
    }, 1000); // Give it a bit more time to settle

    return () => clearTimeout(syncTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackState, isReady, isMounted, user]);

  const handleReady = useCallback(() => {
    setIsReady(true);
    if (playbackState && playerRef.current) {
        // When the player is ready, it should immediately adopt the host's state.
        isSyncing.current = true;
        setLocalIsPlaying(playbackState.isPlaying);
        playerRef.current.seekTo(playbackState.seekTime, 'seconds');
        setTimeout(() => { isSyncing.current = false; }, 1000); // Release lock after sync
    }
  }, [playbackState]);

  const handlePlay = useCallback(() => {
    if (isSyncing.current) return;
    if (!isHost) return;

    if (!localIsPlaying) {
      setLocalIsPlaying(true);
      if (user?.id) {
        onPlaybackChange({ isPlaying: true, seekTime: playerRef.current?.getCurrentTime() || 0 });
      }
    }
  }, [localIsPlaying, onPlaybackChange, user?.id, isHost]);

  const handlePause = useCallback(() => {
    if (isSyncing.current) return;
    if (!isHost) return;
    
    if (localIsPlaying) {
      setLocalIsPlaying(false);
      if (user?.id) {
        onPlaybackChange({ isPlaying: false, seekTime: playerRef.current?.getCurrentTime() || 0 });
      }
    }
  }, [localIsPlaying, onPlaybackChange, user?.id, isHost]);

  const handleSeek = useCallback((seconds: number) => {
    if (isSyncing.current) return;
    if (!isHost) return;
    
    if (user?.id) {
        onPlaybackChange({ isPlaying: localIsPlaying, seekTime: seconds });
    }
  }, [localIsPlaying, onPlaybackChange, user?.id, isHost]);
  
  const handleProgress = useCallback((progress: OnProgressProps) => {
    if (isSyncing.current || !isHost || !localIsPlaying) {
      return;
    }
    
    const now = Date.now();
    if (now - lastProgressUpdate.current > 5000) {
      lastProgressUpdate.current = now;
      onPlaybackChange({ isPlaying: true, seekTime: progress.playedSeconds });
    }
  }, [isHost, localIsPlaying, onPlaybackChange]);

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
    let description = isHost ? 'The host can use the "Set Video" or "Share Screen" buttons to start.' : "Waiting for the host to start a video...";

    if (urlError) {
      Icon = AlertTriangle;
      title = "Video Playback Error";
      description = "The provider is blocking playback here. The host should try using the 'Share Screen' feature instead.";
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
