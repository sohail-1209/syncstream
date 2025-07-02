import { Card } from "@/components/ui/card";
import EmojiBar from "./emoji-bar";
import { Film } from "lucide-react";

export default function VideoPlayer({ videoUrl }: { videoUrl: string }) {
  return (
    <Card className="w-full aspect-video lg:h-full lg:aspect-auto bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
      <div className="relative flex-1 bg-black group">
        {videoUrl ? (
          <>
            <video
              key={videoUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              src={videoUrl}
            >
              Your browser does not support the video tag.
            </video>
            <EmojiBar />
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-black/50">
            <Film className="h-16 w-16 mb-4" />
            <h2 className="text-2xl font-bold">No Video Loaded</h2>
            <p className="text-lg">Use the "Set Video" button to load a video.</p>
          </div>
        )}
      </div>
    </Card>
  );
}
