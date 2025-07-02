import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    PictureInPicture2,
  } from "lucide-react";
  import Image from "next/image";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Slider } from "@/components/ui/slider";
  import EmojiBar from "./emoji-bar";
  
  export default function VideoPlayer() {
    return (
      <Card className="w-full h-full bg-card flex flex-col overflow-hidden shadow-2xl shadow-primary/10">
        <div className="relative flex-1 bg-black group">
          <Image
            src="https://placehold.co/1280x720/141218/1A1820"
            alt="Video stream placeholder"
            layout="fill"
            objectFit="contain"
            className="opacity-70"
            data-ai-hint="movie screen"
          />
          <EmojiBar />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="flex items-center gap-3 text-white">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Play className="h-6 w-6" />
              </Button>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs">01:23</span>
                <Slider defaultValue={[33]} max={100} step={1} className="w-full" />
                <span className="text-xs">04:56</span>
              </div>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Volume2 className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <PictureInPicture2 className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }
  