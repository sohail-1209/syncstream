'use server';

/**
 * @fileOverview AI agent that recommends movies or shows based on shared preferences.
 *
 * - recommendContent - A function that handles the content recommendation process.
 * - RecommendContentInput - The input type for the recommendContent function.
 * - RecommendContentOutput - The return type for the recommendContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendContentInputSchema = z.object({
  watchHistory: z
    .array(z.string())
    .describe('The watch history of all participants in the session.'),
  preferences: z
    .array(z.string())
    .describe('The preferences of all participants in the session.'),
});
export type RecommendContentInput = z.infer<typeof RecommendContentInputSchema>;

const RecommendContentOutputSchema = z.object({
  recommendations: z
    .array(z.string())
    .describe('The recommended movies or shows based on shared preferences.'),
  reasoning: z
    .string()
    .describe('The reasoning behind the recommendations.'),
});
export type RecommendContentOutput = z.infer<typeof RecommendContentOutputSchema>;

export async function recommendContent(input: RecommendContentInput): Promise<RecommendContentOutput> {
  return recommendContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendContentPrompt',
  input: {schema: RecommendContentInputSchema},
  output: {schema: RecommendContentOutputSchema},
  prompt: `You are a movie and TV show recommendation expert.

You will receive the watch history and preferences of a group of people. You will use this information to recommend movies or shows that the group would enjoy watching together.

Watch History: {{{watchHistory}}}
Preferences: {{{preferences}}}

Based on this information, what movies or shows would you recommend? Explain your reasoning.`,
});

const recommendContentFlow = ai.defineFlow(
  {
    name: 'recommendContentFlow',
    inputSchema: RecommendContentInputSchema,
    outputSchema: RecommendContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
