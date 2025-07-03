'use client';

import { useEffect, useState, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
  useTracks,
  GridLayout,
  ParticipantTile,
  ControlBar,
} from '@livekit/components-react';
import { useLocalUser } from '@/hooks/use-local-user';
import { RoomEvent, Track, DisconnectReason, setLogLevel, LogLevel } from 'livekit-client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { ScreenShare, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';


// Silences benign "cannot send signal request before connected" errors in development.
// This is a known side effect of React's Strict Mode.
if (process.env.NODE_ENV === 'development') {
  setLogLevel(LogLevel.warn);
}

function ScreenShareManager({ sharerId }: { sharerId: string }) {
    const room = useRoomContext();
    const localUser = useLocalUser();

    useEffect(() => {
        const startSharing = () => {
             if (localUser?.id === sharerId) {
                room.localParticipant.setScreenShareEnabled(true, { audio: true });
            }
        }

        if (room.state === 'connected') {
            startSharing();
        } else {
            room.once(RoomEvent.Connected, startSharing);
        }

        return () => {
            if (localUser?.id === sharerId && room.localParticipant.isScreenShareEnabled) {
                 if (room.state === 'connected') {
                    room.localParticipant.setScreenShareEnabled(false);
                 }
            }
        };
    }, [sharerId, localUser, room]);

    return null;
}

function CustomVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  const { toast } = useToast();
  const [isPlaceholderFullscreen, setIsPlaceholderFullscreen] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsPlaceholderFullscreen(document.fullscreenElement === placeholderRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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


  if (tracks.length === 0) {
    return (
      <Card 
        ref={placeholderRef} 
        className="w-full h-full bg-card flex flex-col text-muted-foreground bg-black/50"
      >
        <div className="w-full flex justify-end p-2">
            <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:text-white hover:bg-white/10"
                onClick={togglePlaceholderFullscreen}
                aria-label={isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
            >
                {isPlaceholderFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                <span className="sr-only">{isPlaceholderFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}</span>
            </Button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-4 -mt-14">
            <ScreenShare className="h-16 w-16 mb-4" />
            <h2 className="text-2xl font-bold">Waiting for screen share...</h2>
            <p className="text-lg">The host has not started sharing their screen yet.</p>
        </div>
      </Card>
    );
  }

  return (
    <GridLayout tracks={tracks} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
  );
}


export default function LiveKitStage({ token, roomName, sharerId }: { token: string; roomName: string; sharerId: string }) {
    const { toast } = useToast();

    if (!process.env.NEXT_PUBLIC_LIVEKIT_URL) {
        return <div className="flex items-center justify-center h-full">LiveKit URL is not configured.</div>
    }

    return (
        <div style={{ height: '100%', width: '100%' }}>
            <LiveKitRoom
                token={token}
                serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
                connect={true}
                audio={true}
                video={false} // Default to no camera
                data-lk-theme="default"
                style={{ height: '100%' }}
                onDisconnected={(reason) => {
                    // Avoid showing a toast for expected disconnections like leaving the room.
                    if (
                        reason === DisconnectReason.CLIENT_INITIATED ||
                        reason === DisconnectReason.SIGNAL_CLOSE ||
                        reason === DisconnectReason.DUPLICATE_IDENTITY
                    ) {
                       return;
                    }

                    toast({
                        variant: 'destructive',
                        title: 'Disconnected from room',
                        description: `The connection was lost unexpectedly. Reason: ${DisconnectReason[reason ?? DisconnectReason.UNKNOWN_REASON]}`,
                    });
                }}
            >
                <CustomVideoConference />
                <RoomAudioRenderer />
                <ScreenShareManager sharerId={sharerId} />
                <ControlBar
                    controls={{
                        microphone: true,
                        camera: false,
                        chat: false,
                        screenShare: false,
                        leave: false,
                    }}
                />
            </LiveKitRoom>
        </div>
    );
}
