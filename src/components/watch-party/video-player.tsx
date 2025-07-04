
'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Film, AlertTriangle, Maximize, Minimize, Loader2 } from "lucide-react";
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

export type VideoPlayerStatus = 'idle' | 'loading' | 'ready' | 'error';

type VideoPlayerProps = { 
  videoSource: ProcessVideoUrlOutput | null;
  playbackState: PlaybackState;
  onPlaybackChange: (newState: { isPlaying: boolean, seekTime: number }) => void;
  user: LocalUser | null;
  isHost: boolean;
  onStatusChange: (status: VideoPlayerStatus) => void;
};

export interface VideoPlayerRef {
  syncToHost: () => void;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer({ 
  videoSource,
  playbackState,
  onPlaybackChange,
  user,
  isHost,
  onStatusChange
}, ref) {
  const { toast } = useToast();
  const playerRef = useRef<ReactPlayer>(null);
  const isSyncing = useRef(false);
  const lastProgressUpdate = useRef(0);
  const lastHostUpdate = useRef(0);

  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPlaceholderFullscreen, setIsPlaceholderFullscreen] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<VideoPlayerStatus>('idle');
  const [playerConfig, setPlayerConfig] = useState({});

  const handleStatusChange = useCallback((newStatus: VideoPlayerStatus) => {
    setStatus(newStatus);
    if (onStatusChange) {
        onStatusChange(newStatus);
    }
  }, [onStatusChange]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
        setPlayerConfig({
            youtube: {
                playerVars: {
                    origin: window.location.origin
                }
            }
        });
    }
  }, [isMounted]);

  useEffect(() => {
    if (videoSource) {
      handleStatusChange('loading');
    } else {
      handleStatusChange('idle');
    }
  }, [videoSource, handleStatusChange]);

  useEffect(() => {
    if (status !== 'loading') return;

    const timer = setTimeout(() => {
        if (status === 'loading') {
            handleStatusChange('error');
            toast({
                title: "Video Error",
                description: "The video took too long to load. The provider may be blocking it or the link is invalid.",
                variant: "destructive",
                duration: 8000,
            });
        }
    }, 10000); 

    return () => clearTimeout(timer);
  }, [status, toast, handleStatusChange]);


  // Sync remote state to local player
  useEffect(() => {
    if (!playbackState || status !== 'ready' || !playerRef.current || !user || !isMounted) {
      return;
    }
    
    if (playbackState.updatedAt <= lastHostUpdate.current) {
        return;
    }

    if (playbackState.updatedBy === user.id) {
      return;
    }

    lastHostUpdate.current = playbackState.updatedAt;
    isSyncing.current = true;

    if (localIsPlaying !== playbackState.isPlaying) {
      setLocalIsPlaying(playbackState.isPlaying);
    }

    const localTime = playerRef.current.getCurrentTime() || 0;
    const remoteTime = playbackState.seekTime || 0;

    if (Math.abs(localTime - remoteTime) > 1.5) {
      playerRef.current.seekTo(remoteTime, 'seconds');
    }
    
    const syncTimeout = setTimeout(() => {
      isSyncing.current = false;
    }, 1000);

    return () => clearTimeout(syncTimeout);
  }, [playbackState, status, isMounted, user, localIsPlaying]);

  useEffect(() => {
      if (status === 'ready' && playbackState && playerRef.current) {
          isSyncing.current = true;
          setLocalIsPlaying(playbackState.isPlaying);
          playerRef.current.seekTo(playbackState.seekTime, 'seconds');
          setTimeout(() => { isSyncing.current = false; }, 500);
      }
  }, [status, playbackState]);

  const handleReady = useCallback(() => {
    handleStatusChange('ready');
  }, [handleStatusChange]);

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
  }, [isHost, localIsPlaying, onPlaybackChange, user?.id]);
  
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
        setIsPlaceholderFullscreen(document.fullscreenElement === placeholderRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleUrlError = useCallback(() => {
    handleStatusChange('error');
    toast({
      title: "Video Error",
      description:
        "Could not play the content. The provider may be blocking it (CORS policy). The most reliable solution is to use Screen Sharing.",
      variant: "destructive",
      duration: 8000,
    });
  }, [toast, handleStatusChange]);

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
      : "Waiting for the host to start a video.";
    let iconClassName = '';

    if (status === 'loading') {
        Icon = Loader2;
        title = "Loading Video...";
        description = "Attempting to load the video. This may take a moment."
        iconClassName = 'animate-spin';
    } else if (status === 'error') {
      Icon = AlertTriangle;
      title = "Video Playback Error";
      description = "The provider is blocking playback or the link is invalid. The host should try the 'Share Screen' feature instead.";
      iconClassName = 'text-destructive';
    }

    return (
      <div ref={placeholderRef} className="w-full h-full bg-black/50 flex flex-col relative">
        <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground p-4">
            <Icon className={`h-12 w-12 md:h-16 md:w-16 mb-4 ${iconClassName}`} />
            <h2 className="text-xl md:text-2xl font-bold">{title}</h2>
            <p className="text-base md:text-lg max-w-xl">{description}</p>
        </div>
        <div className="absolute bottom-2 right-2 flex gap-2 md:hidden">
            <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 text-white hover:text-white hover:bg-white/20 rounded-full"
                onClick={togglePlaceholderFullscreen}
                aria-label={isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                title={isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
            >
                {isPlaceholderFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
            </Button>
        </div>
      </div>
    );
  }
  
  return (
    <Card className="w-full h-full bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10 relative">
      <div className="relative flex-1 bg-black group">
        <div style={{ display: status === 'ready' ? 'block' : 'none', width: '100%', height: '100%' }}>
          {isMounted && videoSource && (
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
              config={playerConfig}
            />
          )}
        </div>
        {status !== 'ready' && renderPlaceholder()}
      </div>
    </Card>
  );
});

export default VideoPlayer;
