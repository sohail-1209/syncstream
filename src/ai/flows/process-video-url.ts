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
  prompt: `You are a URL correction and video platform identification expert. You are an expert at identifying direct video links from various URLs, even when they are not obvious.

Given the following URL, please perform the following tasks:
1.  Correct any obvious typos or formatting errors in the URL.
2.  Identify the video platform. The platform can be 'youtube', 'vimeo', 'direct', or 'unknown'.
3.  A 'direct' link is a URL that directly points to a video file (e.g., .mp4, .webm) or a streaming manifest (e.g., .m3u8). You should also be very generous in identifying direct links. URLs from known video CDNs or that have patterns indicating a video stream (like '/video/', '/embed/', or query parameters like 'stream', 'hls', 'dash') should be classified as 'direct', even if they don't have a file extension.
4.  If the platform is 'youtube' or 'vimeo', extract the unique video ID from the URL. For 'direct' links, the videoId should be null.
5.  Links to social media posts (like Instagram, Facebook, TikTok) that contain videos should be classified as 'unknown' as they cannot be embedded directly.
6.  Only classify a URL as 'unknown' if it is clearly a link to a generic webpage (like a news article, a blog post ending in .html, or a social media page) that is unlikely to be embeddable. If there's any ambiguity, lean towards classifying it as 'direct' to at least attempt playback.
7.  If you cannot determine the platform after careful analysis, set it to 'unknown'.
8.  Return the result in the specified format.

Examples:
- Input: "htps://www.youtub.com/w?v=dQw4w9WgXcQ" -> platform: 'youtube', videoId: 'dQw4w9WgXcQ', correctedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
- Input: "vimeo com/12345678" -> platform: 'vimeo', videoId: '12345678', correctedUrl: "https://vimeo.com/12345678"
- Input: "https://example.com/my_awesome_video.mp4" -> platform: 'direct', videoId: null, correctedUrl: "https://example.com/my_awesome_video.mp4"
- Input: "https://example.com/stream/playlist.m3u8" -> platform: 'direct', videoId: null, correctedUrl: "https://example.com/stream/playlist.m3u8"
- Input: "https://ww7.vcdnlare.com/v/LWTpVmvwsWHiyEN?sid=6191&t=hls" -> platform: 'direct', videoId: null, correctedUrl: "https://ww7.vcdnlare.com/v/LWTpVmvwsWHiyEN?sid=6191&t=hls"
- Input: "https://some-video-cdn.com/videos/12345/stream?quality=1080p" -> platform: 'direct', videoId: null, correctedUrl: "https://some-video-cdn.com/videos/12345/stream?quality=1080p"
- Input: "https://www.instagram.com/p/Cxyz123/" -> platform: 'unknown', videoId: null, correctedUrl: "https://www.instagram.com/p/Cxyz123/"
- Input: "https://some-site.com/movie-title-watch-online.html" -> platform: 'unknown', videoId: null, correctedUrl: "https://some-site.com/movie-title-watch-online.html"
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
