
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
  prompt: `You are an expert system that analyzes URLs to identify video content.
Your task is to correct the URL if needed, and determine the video platform.

**CRITICAL INSTRUCTIONS:**
- The 'platform' field MUST be one of the following exact lowercase strings: 'youtube', 'vimeo', 'direct', 'unknown'.
- For 'direct' links, the 'videoId' field MUST be null.
- For 'unknown' links, the 'videoId' field MUST be null.
- For 'youtube' or 'vimeo', you MUST extract the video ID.
- For YouTube URLs, the 'correctedUrl' MUST only contain the 'v' parameter. Remove all other parameters like 'list', 'index', 't', 'si', etc. to ensure clean playback.
- Be generous in identifying 'direct' links. URLs from video CDNs or with streaming terms (like .m3u8, hls, dash) should be 'direct'.
- Social media links (Instagram, Facebook, etc.) are 'unknown'.
- Correct any obvious typos in the URL.

**EXAMPLES:**
- Input: "htps://www.youtub.com/w?v=dQw4w9WgXcQ" -> Output: { platform: 'youtube', videoId: 'dQw4w9WgXcQ', correctedUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }
- Input: "https://www.youtube.com/watch?v=Qdz5n1Xe5Qo&list=RDorYf6VDtj_k&index=3" -> Output: { platform: 'youtube', videoId: 'Qdz5n1Xe5Qo', correctedUrl: "https://www.youtube.com/watch?v=Qdz5n1Xe5Qo" }
- Input: "vimeo com/12345678" -> Output: { platform: 'vimeo', videoId: '12345678', correctedUrl: "https://vimeo.com/12345678" }
- Input: "https://example.com/my_awesome_video.mp4" -> Output: { platform: 'direct', videoId: null, correctedUrl: "https://example.com/my_awesome_video.mp4" }
- Input: "https://ww7.vcdnlare.com/v/LWTpVmvwsWHiyEN?sid=6191&t=hls" -> Output: { platform: 'direct', videoId: null, correctedUrl: "https://ww7.vcdnlare.com/v/LWTpVmvwsWHiyEN?sid=6191&t=hls" }
- Input: "https://www.instagram.com/p/Cxyz123/" -> Output: { platform: 'unknown', videoId: null, correctedUrl: "https://www.instagram.com/p/Cxyz123/" }
- Input: "a random string" -> Output: { platform: 'unknown', videoId: null, correctedUrl: "a random string" }

**TASK:**
Process the following user-provided URL:
\`\`\`
{{{url}}}
\`\`\`
`,
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
