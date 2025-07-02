'use server';

/**
 * @fileOverview AI agent that processes and corrects video URLs.
 *
 * - processVideoUrl - A function that handles the video URL correction and identification process.
 * - ProcessVideoUrlInput - The input type for the processVideoUrl function.
 * - ProcessVideoUrlOutput - The return type for the processVideoUrl function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProcessVideoUrlInputSchema = z.object({
  url: z.string().describe('The video URL provided by the user.'),
});
export type ProcessVideoUrlInput = z.infer<typeof ProcessVideoUrlInputSchema>;

const ProcessVideoUrlOutputSchema = z.object({
  platform: z
    .enum(['youtube', 'vimeo', 'direct', 'unknown'])
    .describe(
      "The identified video platform. 'direct' for video files, 'unknown' if not identifiable."
    ),
  videoId: z
    .string()
    .nullable()
    .describe('The extracted video ID from the URL, if applicable.'),
  correctedUrl: z
    .string()
    .describe('The corrected and cleaned-up video URL.'),
});
export type ProcessVideoUrlOutput = z.infer<typeof ProcessVideoUrlOutputSchema>;

export async function processVideoUrl(
  input: ProcessVideoUrlInput
): Promise<ProcessVideoUrlOutput> {
  return processVideoUrlFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processVideoUrlPrompt',
  input: {schema: ProcessVideoUrlInputSchema},
  output: {schema: ProcessVideoUrlOutputSchema},
  prompt: `You are a URL correction and video platform identification expert. You are an expert at identifying direct video links from various URLs.

Given the following URL, please perform the following tasks:
1.  Correct any obvious typos or formatting errors in the URL.
2.  Identify the video platform. The platform can be 'youtube', 'vimeo', a 'direct' link to a video file (e.g., .mp4, .webm), or 'unknown'.
3.  If the platform is 'youtube' or 'vimeo', extract the unique video ID from the URL. If not applicable, set videoId to null.
4.  If the provided URL is a webpage that embeds a video (e.g., ending in .html), try to infer the direct link to the video file. For example, a page at '.../some-movie-watch-online.html' might have its video at '.../some-movie.mp4'. If you can make a confident guess, set the platform to 'direct' and the 'correctedUrl' to your inferred video file URL.
5.  If you cannot determine the platform or a direct video link, set the platform to 'unknown'.
6.  Return the result in the specified format.

Examples:
- Input: "htps://www.youtub.com/w?v=dQw4w9WgXcQ" -> platform: 'youtube', videoId: 'dQw4w9WgXcQ', correctedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
- Input: "vimeo com/12345678" -> platform: 'vimeo', videoId: '12345678', correctedUrl: "https://vimeo.com/12345678"
- Input: "https://example.com/my_awesome_video.mp4" -> platform: 'direct', videoId: null, correctedUrl: "https://example.com/my_awesome_video.mp4"
- Input: "https://some-site.com/movie-title-watch-online.html" -> platform: 'direct', videoId: null, correctedUrl: "https://some-site.com/movie-title.mp4"
- Input: "a random string" -> platform: 'unknown', videoId: null, correctedUrl: "a random string"

User provided URL: {{{url}}}`,
});

const processVideoUrlFlow = ai.defineFlow(
  {
    name: 'processVideoUrlFlow',
    inputSchema: ProcessVideoUrlInputSchema,
    outputSchema: ProcessVideoUrlOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
