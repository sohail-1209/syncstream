
'use client';

import { useEffect } from 'react';
import { LiveKitRoom, RoomAudioRenderer, VideoConference, useRoomContext } from '@livekit/components-react';
import { useLocalUser } from '@/hooks/use-local-user';
import { Loader2 } from 'lucide-react';
import { RoomEvent } from 'livekit-client';
import { useToast } from '@/hooks/use-toast';

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
                    console.log('disconnected from room', reason);
                    toast({
                        variant: 'destructive',
                        title: 'Disconnected from room',
                        description: reason?.message ?? 'The connection was lost.',
                    });
                }}
            >
                <VideoConference controls={{
                    microphone: true,
                    camera: false,
                    chat: false,
                    screenShare: false,
                    leave: false
                }} />
                <RoomAudioRenderer />
                <ScreenShareManager sharerId={sharerId} />
            </LiveKitRoom>
        </div>
    );
}
