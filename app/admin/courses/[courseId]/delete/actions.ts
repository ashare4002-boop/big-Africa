"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";
import { ApiResponse } from "@/lib/type";

export async function deleteCourse(courseId: string): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    // Delete all enrollments first
    await prisma.enrollment.deleteMany({
      where: { courseId },
    });

    // Delete all infrastructures
    const towns = await prisma.town.findMany({
      where: { courseId },
      include: { infrastructures: true },
    });

    for (const town of towns) {
      await prisma.infrastructure.deleteMany({
        where: { townId: town.id },
      });
    }

    // Delete all towns
    await prisma.town.deleteMany({
      where: { courseId },
    });

    // Delete all lessons
    const chapters = await prisma.chapter.findMany({
      where: { courseId },
      include: { lesson: true },
    });

    for (const chapter of chapters) {
      await prisma.lesson.deleteMany({
        where: { chapterId: chapter.id },
      });
    }

    // Delete all chapters
    await prisma.chapter.deleteMany({
      where: { courseId },
    });

    // Delete the course
    await prisma.course.delete({
      where: { id: courseId },
    });

    return {
      status: "success" as const,
      message: "Course deleted successfully",
      sound: "success" as const,
    };
  } catch (error) {
    logger.error({ err: error }, "Delete course error");
    return {
      status: "error" as const,
      message: "Failed to delete course",
      sound: "error" as const,
    };
  }
}
