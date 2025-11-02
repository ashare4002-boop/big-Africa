"use client";

import { ImageBlockData } from "@/lib/blockTypes";
import { useConstructUrl } from "@/hooks/use-construct-url";
import Image from "next/image";

interface ImageBlockRendererProps {
  data: ImageBlockData;
}

export function ImageBlockRenderer({ data }: ImageBlockRendererProps) {
  const imageUrl = useConstructUrl(data.fileKey);

  if (!imageUrl) return null;

  return (
    <figure className="my-6">
      <div className="relative w-full h-[400px] rounded-lg overflow-hidden">
        <Image
          src={imageUrl}
          alt={data.alt || "Lesson image"}
          fill
          className="object-contain"
        />
      </div>
      {data.caption && (
        <figcaption className="text-center text-sm text-muted-foreground mt-2">
          {data.caption}
        </figcaption>
      )}
    </figure>
  );
}
