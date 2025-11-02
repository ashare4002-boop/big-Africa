"use server";

import { prisma as db } from "@/lib/db";
import {
  BlockType,
  lessonBlockSchema,
  LessonBlockSchema,
} from "@/lib/blockTypes";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/data/admin/require-admin";

export async function addLessonBlock(
  lessonId: string,
  blockData: Omit<LessonBlockSchema, "id">
) {
  try {
    await requireAdmin();

    const validated = lessonBlockSchema.parse({
      ...blockData,
      id: undefined,
    });

    const maxPosition = await db.lessonBlock.findFirst({
      where: { lessonId },
      orderBy: { position: "desc" },
      select: { position: true },
    });

    const newBlock = await db.lessonBlock.create({
      data: {
        lessonId,
        type: validated.type as any,
        position: (maxPosition?.position ?? -1) + 1,
        data: validated.data as any,
      },
    });

    revalidatePath(`/admin/courses`);
    return { success: true, data: newBlock };
  } catch (error) {
    console.error("Error adding lesson block:", error);
    return { success: false, error: "Failed to add block" };
  }
}

export async function updateLessonBlock(
  blockId: string,
  data: Partial<LessonBlockSchema>
) {
  try {
    await requireAdmin();

    const updateData: any = {};
    if (data.data !== undefined) updateData.data = data.data;
    if (data.type !== undefined) updateData.type = data.type;

    const updated = await db.lessonBlock.update({
      where: { id: blockId },
      data: updateData,
    });

    revalidatePath(`/admin/courses`);
    return { success: true, data: updated };
  } catch (error) {
    console.error("Error updating lesson block:", error);
    return { success: false, error: "Failed to update block" };
  }
}

export async function deleteLessonBlock(blockId: string) {
  try {
    await requireAdmin();

    const block = await db.lessonBlock.findUnique({
      where: { id: blockId },
      select: { lessonId: true, position: true },
    });

    if (!block) {
      return { success: false, error: "Block not found" };
    }

    await db.$transaction([
      db.lessonBlock.delete({
        where: { id: blockId },
      }),
      db.lessonBlock.updateMany({
        where: {
          lessonId: block.lessonId,
          position: { gt: block.position },
        },
        data: {
          position: { decrement: 1 },
        },
      }),
    ]);

    revalidatePath(`/admin/courses`);
    return { success: true };
  } catch (error) {
    console.error("Error deleting lesson block:", error);
    return { success: false, error: "Failed to delete block" };
  }
}

export async function reorderLessonBlocks(
  lessonId: string,
  blockOrders: { id: string; position: number }[]
) {
  try {
    await requireAdmin();

    await db.$transaction(
      blockOrders.map((block) =>
        db.lessonBlock.update({
          where: { id: block.id },
          data: { position: block.position },
        })
      )
    );

    revalidatePath(`/admin/courses`);
    return { success: true };
  } catch (error) {
    console.error("Error reordering lesson blocks:", error);
    return { success: false, error: "Failed to reorder blocks" };
  }
}

export async function getLessonBlocks(lessonId: string) {
  try {
    const blocks = await db.lessonBlock.findMany({
      where: { lessonId },
      orderBy: { position: "asc" },
    });

    return { success: true, data: blocks };
  } catch (error) {
    console.error("Error fetching lesson blocks:", error);
    return { success: false, error: "Failed to fetch blocks" };
  }
}
