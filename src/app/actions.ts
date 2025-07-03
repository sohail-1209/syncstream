
"use server";

import { recommendContent, type RecommendContentInput } from "@/ai/flows/recommend-content";
import { processVideoUrl, type ProcessVideoUrlInput } from "@/ai/flows/process-video-url";
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore";
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

export async function deleteRoom(sessionId: string) {
    try {
        if (!sessionId) {
            return { error: "Session ID is required." };
        }
        const sessionRef = doc(db, 'sessions', sessionId);
        
        // Delete participants subcollection
        const participantsRef = collection(sessionRef, 'participants');
        const participantsSnapshot = await getDocs(participantsRef);
        await Promise.all(participantsSnapshot.docs.map(d => deleteDoc(d.ref)));

        // Delete messages subcollection
        const messagesRef = collection(sessionRef, 'messages');
        const messagesSnapshot = await getDocs(messagesRef);
        await Promise.all(messagesSnapshot.docs.map(d => deleteDoc(d.ref)));

        // Delete session document
        await deleteDoc(sessionRef);

        return { success: true };

    } catch (error) {
        console.error("Failed to delete room:", error);
        return { error: "Failed to delete room. Please try again." };
    }
}
