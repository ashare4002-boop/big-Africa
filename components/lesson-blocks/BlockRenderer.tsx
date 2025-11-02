"use client";

import { BlockType, LessonBlock } from "@/lib/blockTypes";
import { TextBlockRenderer } from "./TextBlockRenderer";
import { ImageBlockRenderer } from "./ImageBlockRenderer";
import { VideoBlockRenderer } from "./VideoBlockRenderer";
import { QuizBlockRenderer } from "./QuizBlockRenderer";
import { FileBlockRenderer } from "./FileBlockRenderer";

interface BlockRendererProps {
  blocks: LessonBlock[];
}

export function BlockRenderer({ blocks }: BlockRendererProps) {
  if (!blocks || blocks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No content available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <div key={block.id}>
          {renderBlock(block)}
        </div>
      ))}
    </div>
  );
}

function renderBlock(block: LessonBlock) {
  switch (block.type) {
    case BlockType.TEXT:
      return <TextBlockRenderer data={block.data as any} />;
    case BlockType.IMAGE:
      return <ImageBlockRenderer data={block.data as any} />;
    case BlockType.VIDEO:
      return <VideoBlockRenderer data={block.data as any} />;
    case BlockType.QUIZ:
      return <QuizBlockRenderer data={block.data as any} />;
    case BlockType.FILE:
      return <FileBlockRenderer data={block.data as any} />;
    default:
      return <div>Unknown block type</div>;
  }
}
