
"use server";

import { recommendContent, type RecommendContentInput } from "@/ai/flows/recommend-content";

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
