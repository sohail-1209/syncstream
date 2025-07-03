
"use server";

import { recommendContent, type RecommendContentInput } from "@/ai/flows/recommend-content";
import { processVideoUrl, type ProcessVideoUrlInput } from "@/ai/flows/process-video-url";
import { collection, deleteDoc, doc, getDocs, getDoc, setDoc, serverTimestamp, query } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

        const data: { password?: string, createdAt: any } = {
            createdAt: serverTimestamp()
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

        const hasPassword = !!sessionSnap.data()?.password;
        return { data: { hasPassword }, error: null };

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
        
        const participantsRef = collection(sessionRef, 'participants');
        const participantsSnapshot = await getDocs(participantsRef);
        await Promise.all(participantsSnapshot.docs.map(d => deleteDoc(d.ref)));

        const messagesRef = collection(sessionRef, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        await Promise.all(messagesSnapshot.docs.map(d => deleteDoc(d.ref)));

        await deleteDoc(sessionRef);

        return { success: true };

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
