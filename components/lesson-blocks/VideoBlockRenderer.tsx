"use client";

import { VideoBlockData } from "@/lib/blockTypes";
import { useConstructUrl } from "@/hooks/use-construct-url";

interface VideoBlockRendererProps {
  data: VideoBlockData;
}

export function VideoBlockRenderer({ data }: VideoBlockRendererProps) {
  const videoUrl = useConstructUrl(data.fileKey);

  if (!videoUrl) return null;

  return (
    <figure className="my-6">
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      {data.caption && (
        <figcaption className="text-center text-sm text-muted-foreground mt-2">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}
