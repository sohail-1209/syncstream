
"use server";

import { recommendContent, type RecommendContentInput } from "@/ai/flows/recommend-content";
import { processVideoUrl, type ProcessVideoUrlInput, type ProcessVideoUrlOutput } from "@/ai/flows/process-video-url";
import { collection, deleteDoc, doc, getDocs, getDoc, setDoc, serverTimestamp, query, writeBatch, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AccessToken } from 'livekit-server-sdk';

interface FormInput {
    watchHistory: string;
    preferences: string;
}

export async function getRecommendations(input: FormInput) {
    try {
        const aiInput: RecommendContentInput = {
            watchHistory: input.watchHistory.split('\n').filter(line => line.trim() !== ''),
            preferences: input.preferences.split('\n').filter(line => line.trim() !== '')
        };

        if (aiInput.watchHistory.length === 0 && aiInput.preferences.length === 0) {
            return { data: null, error: "Please provide some watch history or preferences." };
        }

        const recommendations = await recommendContent(aiInput);
        return { data: recommendations, error: null };
    } catch (error) {
        console.error(error);
        return { data: null, error: "Failed to get recommendations. Please try again later." };
    }
}


export async function processAndGetVideoUrl(url: string) {
    try {
        if (!url || url.trim() === '') {
            return { data: null, error: "Please provide a video URL." };
        }
        const aiInput: ProcessVideoUrlInput = { url };
        const videoData = await processVideoUrl(aiInput);

        if (videoData.platform === 'unknown') {
            return { data: null, error: `Could not identify the video source from the provided link. Please check the URL.` }
        }

        return { data: videoData, error: null };
    } catch (error) {
        console.error(error);
        return { data: null, error: "Failed to process the video URL. Please try again later." };
    }
}

export async function createRoomWithPassword(password: string | null) {
    try {
        const newRoomId = Math.random().toString(36).substring(2, 8);
        const sessionRef = doc(db, 'sessions', newRoomId);

        const data: { password?: string, createdAt: any, hostId: string | null } = {
            createdAt: serverTimestamp(),
            hostId: null,
        };

        if (password && password.trim() !== '') {
            data.password = password.trim();
        }

        await setDoc(sessionRef, data);

        return { data: { sessionId: newRoomId }, error: null };
    } catch (error) {
        console.error("Failed to create room:", error);
        return { data: null, error: "Failed to create a new room. Please try again." };
    }
}

export async function getSessionDetails(sessionId: string) {
    try {
        if (!sessionId) {
            return { data: null, error: "Session ID is required." };
        }
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            return { data: null, error: "Room not found." };
        }
        
        const sessionData = sessionSnap.data();
        const hasPassword = !!sessionData?.password;

        let playbackState = null;
        const remotePlaybackData = sessionData?.playbackState;

        if (remotePlaybackData && remotePlaybackData.updatedAt && typeof remotePlaybackData.updatedAt.toMillis === 'function') {
            playbackState = {
                isPlaying: remotePlaybackData.isPlaying,
                seekTime: remotePlaybackData.seekTime,
                updatedBy: remotePlaybackData.updatedBy,
                updatedAt: remotePlaybackData.updatedAt.toMillis()
            };
        } else if (remotePlaybackData) {
            playbackState = remotePlaybackData;
        }

        return { 
            data: { 
                hasPassword, 
                hostId: sessionData?.hostId || null,
                activeSharer: sessionData?.activeSharer || null,
                videoSource: sessionData?.videoSource || null,
                playbackState: playbackState
            }, 
            error: null 
        };

    } catch (error) {
        console.error("Failed to get session details:", error);
        return { data: null, error: "Could not retrieve room details." };
    }
}

export async function verifyPassword(sessionId: string, password: string) {
     try {
        if (!sessionId || !password) {
            return { data: null, error: "Session ID and password are required." };
        }
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            return { data: null, error: "Room not found." };
        }

        const correctPassword = sessionSnap.data()?.password;
        if (correctPassword === password) {
            return { data: { success: true }, error: null };
        } else {
            return { data: { success: false }, error: "Incorrect password." };
        }
    } catch (error) {
        console.error("Failed to verify password:", error);
        return { data: null, error: "An error occurred during verification." };
    }
}

export async function getRooms() {
    try {
        const q = query(collection(db, 'sessions'));
        const querySnapshot = await getDocs(q);
        const sessions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            hasPassword: !!doc.data().password
        }));
        return { data: sessions, error: null };
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return { data: null, error: "Could not fetch existing rooms." };
    }
}

export async function deleteRoom(sessionId: string, password?: string) {
    try {
        if (!sessionId) {
            return { error: "Session ID is required." };
        }
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            return { error: "Room not found." };
        }

        const roomPassword = sessionSnap.data()?.password;
        if (roomPassword) {
            if (!password || password !== roomPassword) {
                return { error: "Incorrect password provided." };
            }
        }
        
        const subcollections = ['participants', 'messages'];
        for (const collName of subcollections) {
            const collRef = collection(sessionRef, collName);
            const snapshot = await getDocs(collRef);
            if (!snapshot.empty) {
                const batch = writeBatch(db);
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
        }

        await deleteDoc(sessionRef);

        return { success: true, error: null };

    } catch (error) {
        console.error("Failed to delete room:", error);
        return { error: "Failed to delete room. Please try again." };
    }
}

export async function getSessionPassword(sessionId: string) {
    try {
        if (!sessionId) {
            return { data: null, error: "Session ID is required." };
        }
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            return { data: null, error: "Room not found." };
        }

        const password = sessionSnap.data()?.password;
        return { data: { password: password || null }, error: null };

    } catch (error) {
        console.error("Failed to get session password:", error);
        return { data: null, error: "Could not retrieve room password." };
    }
}

export async function getLiveKitToken(roomName: string, participantIdentity: string) {
    if (!process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
        return { data: null, error: "LiveKit server environment variables are not configured. Please check your .env.local file." };
    }

    try {
        const at = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
            identity: participantIdentity,
            name: participantIdentity,
        });

        at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

        const token = await at.toJwt();
        return { data: { token }, error: null };
    } catch (error) {
        console.error("Failed to generate LiveKit token:", error);
        return { data: null, error: "Could not generate a connection token." };
    }
}

export async function setScreenSharer(sessionId: string, userId: string | null) {
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const updateData: { activeSharer: string | null; videoSource?: any, playbackState?: any } = { activeSharer: userId };
        if (userId) {
            updateData.videoSource = null;
            updateData.playbackState = null;
        }
        await setDoc(sessionRef, updateData, { merge: true });
        return { success: true, error: null };
    } catch (error) {
        console.error("Failed to set screen sharer:", error);
        return { success: false, error: "Failed to update screen sharer status." };
    }
}

export async function setVideoSourceForSession(sessionId: string, videoSource: ProcessVideoUrlOutput | null) {
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const updateData: { videoSource: ProcessVideoUrlOutput | null; activeSharer?: any, playbackState?: any } = { 
            videoSource: videoSource,
            playbackState: {
                isPlaying: false,
                seekTime: 0,
                updatedBy: 'system',
                updatedAt: serverTimestamp()
            }
        };
        if (videoSource) {
            updateData.activeSharer = null;
        }
        await setDoc(sessionRef, updateData, { merge: true });
        return { success: true, error: null };
    } catch (error) {
        console.error("Failed to set video source:", error);
        return { success: false, error: "Failed to update video source for the session." };
    }
}

export async function updatePlaybackState(sessionId: string, userId: string, state: { isPlaying: boolean, seekTime: number }) {
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const playbackState = {
            ...state,
            updatedBy: userId,
            updatedAt: serverTimestamp()
        };
        await updateDoc(sessionRef, { playbackState });
        return { success: true, error: null };
    } catch (error) {
        console.error("Failed to update playback state:", error);
        return { success: false, error: "Failed to sync video state." };
    }
}

export async function claimHost(sessionId: string, userId: string, password?: string) {
    try {
        const sessionRef = doc(db, 'sessions', sessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
            return { success: false, error: "Room not found.", newHostId: null };
        }

        const sessionData = sessionSnap.data();
        const roomPassword = sessionData?.password;

        if (roomPassword) {
            if (!password || password !== roomPassword) {
                return { success: false, error: "Incorrect password.", newHostId: sessionData?.hostId || null };
            }
        }
        
        const currentHostId = sessionData?.hostId;
        let newHostId: string | null;

        if (currentHostId === userId) {
            // User is abdicating host role
            newHostId = null;
        } else {
            // User is claiming host role
            newHostId = userId;
        }
        
        await updateDoc(sessionRef, { hostId: newHostId });

        return { success: true, error: null, newHostId };

    } catch (error) {
        console.error("Failed to claim host:", error);
        return { success: false, error: "An error occurred while updating the host.", newHostId: null };
    }
}
    

    
