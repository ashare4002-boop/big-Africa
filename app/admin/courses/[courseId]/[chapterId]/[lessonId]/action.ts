"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/type";
import { lessonSchema, LessonSchemaType } from "@/lib/zodSchema";

// for lesson <----| edit to add course creation.
// The use of this server action?

export async function updateLesson(
  values: LessonSchemaType,
  lessonId: string
): Promise<ApiResponse> {
    
  await requireAdmin();

  try {
    const result = lessonSchema.safeParse(values);
    if (!result.success) {
      return {
        status: "error",
        message: "invalid data",
        sound: "error",
      };
    }

    await prisma.lesson.update({
      where: {
        id: lessonId,
      },

      data: {
        title: result.data.name,
        description: result.data.description,
        thumbnailKey: result.data.thumbnailKey,
        videoKey: result.data.videoKey,
      },
    });

    return {
      status: "success",
      message: "Lesson updated successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to update lesson",
      sound: "error",
    };
  }
}
