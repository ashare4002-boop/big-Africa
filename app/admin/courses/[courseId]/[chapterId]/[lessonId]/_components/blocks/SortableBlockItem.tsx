"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockType, LessonBlock, BlockData } from "@/lib/blockTypes";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, Trash2 } from "lucide-react";
import { TextBlockEditor } from "./TextBlockEditor";
import { ImageBlockEditor } from "./ImageBlockEditor";
import { VideoBlockEditor } from "./VideoBlockEditor";
import { QuizBlockEditor } from "./QuizBlockEditor";
import { FileBlockEditor } from "./FileBlockEditor";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SortableBlockItemProps {
  block: LessonBlock;
  onUpdate: (blockId: string, data: BlockData) => void;
  onDelete: (blockId: string) => void;
}

export function SortableBlockItem({
  block,
  onUpdate,
  onDelete,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleUpdate = (data: BlockData) => {
    onUpdate(block.id, data);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="cursor-grab"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </Button>
            <Badge variant="secondary">{getBlockTypeLabel(block.type)}</Badge>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Block</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this block? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(block.id)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent>
          {renderBlockEditor(block.type, block.data, handleUpdate)}
        </CardContent>
      </Card>
    </div>
  );
}

function renderBlockEditor(
  type: BlockType,
  data: BlockData,
  onChange: (data: BlockData) => void
) {
  switch (type) {
    case BlockType.TEXT:
      return <TextBlockEditor data={data as any} onChange={onChange} />;
    case BlockType.IMAGE:
      return <ImageBlockEditor data={data as any} onChange={onChange} />;
    case BlockType.VIDEO:
      return <VideoBlockEditor data={data as any} onChange={onChange} />;
    case BlockType.QUIZ:
      return <QuizBlockEditor data={data as any} onChange={onChange} />;
    case BlockType.FILE:
      return <FileBlockEditor data={data as any} onChange={onChange} />;
    default:
      return <div>Unknown block type</div>;
  }
}

function getBlockTypeLabel(type: BlockType): string {
  switch (type) {
    case BlockType.TEXT:
      return "Text";
    case BlockType.IMAGE:
      return "Image";
    case BlockType.VIDEO:
      return "Video";
    case BlockType.QUIZ:
      return "Quiz";
    case BlockType.FILE:
      return "File";
    default:
      return "Unknown";
  }
}
