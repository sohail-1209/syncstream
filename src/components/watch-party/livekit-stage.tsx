
'use client';

import { useEffect } from 'react';
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
import { RoomEvent, Track, DisconnectReason } from 'livekit-client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { ScreenShare } from 'lucide-react';

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

  if (tracks.length === 0) {
    return (
      <Card className="w-full h-full bg-card flex flex-col items-center justify-center overflow-hidden text-muted-foreground bg-black/50">
        <ScreenShare className="h-16 w-16 mb-4" />
        <h2 className="text-2xl font-bold">Waiting for screen share...</h2>
        <p className="text-lg">The host has not started sharing their screen yet.</p>
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
                onError={(error) => {
                    // This specific error is benign and happens on fast re-renders/unmounts in React's strict mode.
                    // We can safely ignore it to keep the console clean.
                    if (String(error).toLowerCase().includes('cannot send signal request before connected')) {
                        console.log('Ignoring benign LiveKit disconnect error.');
                        return;
                    }
                     toast({
                        variant: 'destructive',
                        title: 'LiveKit Connection Error',
                        description: error.message,
                    });
                }}
                onDisconnected={(reason) => {
                    console.log('disconnected from room', reason);
                    // Avoid showing a toast for expected disconnections
                    if (
                        reason === DisconnectReason.CLIENT_INITIATED || 
                        reason === DisconnectReason.UNKNOWN_REASON ||
                        reason === DisconnectReason.SIGNAL_CLOSE
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
