"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useState} from "react";
import { BlockType, LessonBlock, BlockData } from "@/lib/blockTypes";
import { SortableBlockItem } from "./SortableBlockItem";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import {
  addLessonBlock,
  updateLessonBlock,
  deleteLessonBlock,
  reorderLessonBlocks,
} from "@/app/admin/courses/[courseId]/[chapterId]/[lessonId]/block-actions";
import { toast } from "sonner";

interface BlockEditorProps {
  lessonId: string;
  initialBlocks: LessonBlock[];
}

export function BlockEditor({ lessonId, initialBlocks }: BlockEditorProps) {
  const [blocks, setBlocks] = useState<LessonBlock[]>(initialBlocks);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);

      const newBlocks = arrayMove(blocks, oldIndex, newIndex);
      const reordered = newBlocks.map((block, index) => ({
        ...block,
        position: index,
      }));

      setBlocks(reordered);

      const result = await reorderLessonBlocks(
        lessonId,
        reordered.map((b) => ({ id: b.id, position: b.position }))
      );

      if (result.success) {
        toast.success("Blocks reordered");
      } else {
        toast.error("Failed to reorder blocks");
        setBlocks(blocks);
      }
    }
  };

  const handleAddBlock = async (type: BlockType) => {
    setIsSaving(true);
    const defaultData = getDefaultBlockData(type);

    const result = await addLessonBlock(lessonId, {
      type,
      position: blocks.length,
      data: defaultData,
    });

    setIsSaving(false);

    if (result.success && result.data) {
      setBlocks([...blocks, result.data as LessonBlock]);
      toast.success("Block added");
    } else {
      toast.error("Failed to add block");
    }
  };

  const handleUpdateBlock = async (blockId: string, data: BlockData) => {
    const result = await updateLessonBlock(blockId, { data });

    if (result.success) {
      setBlocks(
        blocks.map((b) => (b.id === blockId ? { ...b, data } : b))
      );
    } else {
      toast.error("Failed to update block");
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const result = await deleteLessonBlock(blockId);

    if (result.success) {
      setBlocks(blocks.filter((b) => b.id !== blockId));
      toast.success("Block deleted");
    } else {
      toast.error("Failed to delete block");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Lesson Content</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button disabled={isSaving}>
              <Plus className="h-4 w-4 mr-2" />
              Add Block
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleAddBlock(BlockType.TEXT)}>
              Text / Rich Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddBlock(BlockType.IMAGE)}>
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddBlock(BlockType.VIDEO)}>
              Video
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddBlock(BlockType.QUIZ)}>
              Quiz
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAddBlock(BlockType.FILE)}>
              File
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            No content blocks yet. Click &quot;Add Block&quot; to get started.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((b) => b.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {blocks.map((block) => (
                <SortableBlockItem
                  key={block.id}
                  block={block}
                  onUpdate={handleUpdateBlock}
                  onDelete={handleDeleteBlock}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function getDefaultBlockData(type: BlockType): BlockData {
  switch (type) {
    case BlockType.TEXT:
      return { content: "" };
    case BlockType.IMAGE:
      return { fileKey: "", alt: "", caption: "" };
    case BlockType.VIDEO:
      return { fileKey: "", caption: "" };
    case BlockType.QUIZ:
      return {
        question: "",
        type: "multiple-choice",
        options: [],
        correctAnswer: 0,
        explanation: "",
      };
    case BlockType.FILE:
      return { fileKey: "", fileName: "", fileType: "" };
    default:
      return { content: "" };
  }
}
