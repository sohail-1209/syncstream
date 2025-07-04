
'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Film, AlertTriangle, Maximize, Minimize } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
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

type VideoPlayerProps = { 
  videoSource: ProcessVideoUrlOutput | null;
  playbackState: PlaybackState;
  onPlaybackChange: (newState: { isPlaying: boolean, seekTime: number }) => void;
  user: LocalUser | null;
  isHost: boolean;
};

export interface VideoPlayerRef {
  syncToHost: () => void;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer({ 
  videoSource,
  playbackState,
  onPlaybackChange,
  user,
  isHost
}, ref) {
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
    if (playbackState.updatedAt <= lastHostUpdate.current) {
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

  useEffect(() => {
      if (isReady && playbackState && playerRef.current) {
          isSyncing.current = true;
          setLocalIsPlaying(playbackState.isPlaying);
          playerRef.current.seekTo(playbackState.seekTime, 'seconds');
          setTimeout(() => { isSyncing.current = false; }, 500);
      }
  }, [isReady, playbackState]);

  const handleReady = useCallback(() => {
    setIsReady(true);
  }, []);

  const handlePlay = useCallback(() => {
    if (isSyncing.current) return;
    
    if (!localIsPlaying) {
        setLocalIsPlaying(true);
    }
    
    if (isHost && user?.id) {
      onPlaybackChange({ isPlaying: true, seekTime: playerRef.current?.getCurrentTime() || 0 });
    }
  }, [isHost, localIsPlaying, onPlaybackChange, user?.id]);

  const handlePause = useCallback(() => {
    if (isSyncing.current) return;
    
    if (localIsPlaying) {
        setLocalIsPlaying(false);
    }

    if (isHost && user?.id) {
      onPlaybackChange({ isPlaying: false, seekTime: playerRef.current?.getCurrentTime() || 0 });
    }
  }, [isHost, localIsPlaying, onPlaybackChange, user?.id]);

  const handleSeek = useCallback((seconds: number) => {
    if (isSyncing.current) return;
    
    if (isHost && user?.id) {
        onPlaybackChange({ isPlaying: localIsPlaying, seekTime: seconds });
    }
  }, [isHost, isSyncing, localIsPlaying, onPlaybackChange, user?.id]);
  
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
  
  const handleSyncToHost = () => {
    if (!playbackState || !playerRef.current) {
        toast({
            variant: "destructive",
            title: "Sync Failed",
            description: "No host playback data available to sync to.",
        });
        return;
    }
    
    isSyncing.current = true;
    playerRef.current.seekTo(playbackState.seekTime, 'seconds');
    setLocalIsPlaying(playbackState.isPlaying);

    toast({
        title: "Synced!",
        description: `Jumped to host's current position.`,
    });

    setTimeout(() => {
      isSyncing.current = false;
    }, 1000);
  };

  useImperativeHandle(ref, () => ({
    syncToHost: handleSyncToHost
  }));

  const renderPlaceholder = () => {
    let Icon = Film;
    let title = "No Video Loaded";
    let description = isHost 
      ? 'You are the host. Use the "Set Video" button to load a video for everyone.'
      : "Waiting for the host to start a video. Click the player to activate if needed.";

    if (urlError) {
      Icon = AlertTriangle;
      title = "Video Playback Error";
      description = "The provider is blocking playback. The host should try the 'Share Screen' feature instead.";
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
    <Card className="w-full h-full bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10 relative">
      <div className="relative flex-1 bg-black group">
        {isMounted && videoSource && !urlError ? (
          <ReactPlayer
            ref={playerRef}
            key={videoSource.correctedUrl}
            url={videoSource.correctedUrl}
            playing={localIsPlaying}
            controls={true}
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
        ) : (
           renderPlaceholder()
        )}
      </div>
    </Card>
  );
});

export default VideoPlayer;
