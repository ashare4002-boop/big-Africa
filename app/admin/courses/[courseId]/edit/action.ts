"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import arcjet, { detectBot, fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/type";
import {
  chapterSchema,
  ChapterSchemaType,
  courseSchema,
  CourseSchemaType,
  lessonSchema,
  LessonSchemaType,
} from "@/lib/zodSchema";
import { request } from "@arcjet/next";
import { revalidatePath } from "next/cache";

const aj = arcjet
  .withRule(
    detectBot({
      mode: "LIVE",
      allow: [],
    })
  )
  .withRule(
    fixedWindow({
      mode: "LIVE",
      window: "1m",
      max: 2, // max 2 requests
    })
  );

export async function editCourse(
  data: CourseSchemaType,
  courseId: string
): Promise<ApiResponse> {
  const user = requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: (await user).user.id,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return {
          status: "error",
          message: "Access Denied...Rate Limit...",
          sound: "info",
        };
      } else {
        return {
          status: "error",
          message: "Access Denied...if an error please contact support.",
          sound: "info",
        };
      }
    }
    const result = courseSchema.safeParse(data);

    if (!result.success) {
      return {
        status: "error",
        message: "invalid data",
        sound: "error",
      };
    }

    await prisma.course.update({
      where: {
        id: courseId,
        userId: (await user).user.id, // <------ why?
      },

      data: {
        ...result.data,
      },
    });

    return {
      status: "success",
      message: "Course updated successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to update course. Please try again",
      sound: "error",
    };
  }
}

export async function reorderLessons(
  chapterId: string,
  lessons: { id: string; position: number }[],
  courseId: string
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    if (!lessons || lessons.length === 0) {
      return {
        status: "error",
        message: "Missing lessons for reordering. Please try again.",
        sound: "error",
      };
    }

    const updates = lessons.map((lesson) =>
      prisma.lesson.update({
        where: {
          id: lesson.id,
          chapterId: chapterId,
        },

        data: {
          position: lesson.position,
        },
      })
    );

    await prisma.$transaction(updates);
    revalidatePath(`/admin/courses/${courseId}/edit`); // <---- allow you to purge cached data....

    return {
      status: "success",
      message: "Lessons reordered successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to reorder lessons",
      sound: "error",
    };
  }
}

export async function reorderChapters(
  courseId: string,
  chapters: { id: string; position: number }[]
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    if (!chapters || chapters.length === 0) {
      return {
        status: "error",
        message: "No chapters provided for reordering",
        sound: "error",
      };
    }

    const updates = chapters.map((chapter) =>
      prisma.chapter.update({
        where: {
          id: chapter.id,
          courseId: courseId,
        },

        data: {
          position: chapter.position,
        },
      })
    );
    await prisma.$transaction(updates);

    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Chapters reordered successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to reorder chapters",
      sound: "error",
    };
  }
}

export async function createChapter(
  values: ChapterSchemaType
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    const result = chapterSchema.safeParse(values);

    if (!result.success) {
      return {
        status: "error",
        message: "Invalid data",
        sound: "error",
      };
    }

    await prisma.$transaction(async (tx) => {
      // <--- To order chapter position so to avoid conflict, locks db operations
      const maxPos = await tx.chapter.findFirst({
        where: {
          courseId: result.data.courseId,
        },
        select: {
          position: true,
        },
        orderBy: {
          position: "desc",
        },
      });

      await tx.chapter.create({
        data: {
          title: result.data.name,
          courseId: result.data.courseId,
          position: (maxPos?.position ?? 0) + 1, // <--- if maxPos is define we add 1 if not we pass 1
        },
      });
    });

    revalidatePath(`/admin/courses/${result.data.courseId}/edit`);

    return {
      status: "success",
      message: "Chapter created successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to create chapter",
      sound: "error",
    };
  }
}

export async function createLesson(
  values: LessonSchemaType
): Promise<ApiResponse> {
  await requireAdmin();

  try {
    const result = lessonSchema.safeParse(values);

    if (!result.success) {
      return {
        status: "error",
        message: "Invalid data",
        sound: "error",
      };
    }

    await prisma.$transaction(async (tx) => {
      // <--- To order chapter position so to avoid conflict, locks db operations
      const maxPos = await tx.lesson.findFirst({
        where: {
          chapterId: result.data.chapterId,
        },
        select: {
          position: true,
        },
        orderBy: {
          position: "desc",
        },
      });

      await tx.lesson.create({
        data: {
          title: result.data.name,
          description: result.data.description,
          chapterId: result.data.chapterId,
          videoKey: result.data.videoKey,
          thumbnailKey: result.data.thumbnailKey,
          position: (maxPos?.position ?? 0) + 1, // <--- if maxPos is define we add 1 if not we pass 1
        },
      });
    });

    revalidatePath(`/admin/courses/${result.data.courseId}/edit`);

    return {
      status: "success",
      message: "Lesson created successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to create lesson",
      sound: "error",
    };
  }
}

export async function deleteLesson({
  chapterId,
  courseId,
  lessonId,
}: {
  chapterId: string;
  courseId: string;
  lessonId: string;
}): Promise<ApiResponse> {
  await requireAdmin();

  try {
    const chapterWithLessons = await prisma.chapter.findUnique({
      where: {
        id: chapterId,
      },
      select: {
        lesson: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            position: true,
          },
        },
      },
    });

    if (!chapterWithLessons) {
      return {
        status: "error",
        message: "Chapter not found",
        sound: "error",
      };
    }

    const lessons = chapterWithLessons.lesson;
    const lessonToDelete = lessons.find((lesson) => lesson.id === lessonId);

    if (!lessonToDelete) {
      return {
        status: "error",
        message: "Lesson not found in the chapter. Please try again",
        sound: "error",
      };
    }

    const remainingLessons = lessons.filter((lesson) => lesson.id !== lessonId);

    const updates = remainingLessons.map((lesson, index) => {
      // <--- reordering the position
      return prisma.lesson.update({
        where: {
          id: lesson.id,
        },

        data: {
          position: index + 1,
        },
      });
    });

    await prisma.$transaction([
      // <--- This is a database transaction is a sequence of operation that are perform as single and atomic unit work...
      ...updates, // <---- Spreading updates...
      prisma.lesson.delete({
        where: {
          id: lessonId,
          chapterId: chapterId,
        },
      }),
    ]);

    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Lesson deleted successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to delete lesson",
      sound: "error",
    };
  }
}

export async function deleteChapter({
  chapterId,
  courseId,
}: {
  chapterId: string;
  courseId: string; 
}): Promise<ApiResponse> {
  await requireAdmin();

  try {
    const courserWithChapters = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        chapters: {
          orderBy: {
            position: "asc",
          },
          select: {
            id: true,
            position: true,
          },
        },
      },
    });

    if (!courserWithChapters) {
      return {
        status: "error",
        message: "Course not found",
        sound: "error",
      };
    }

    const chapters = courserWithChapters.chapters;
    const chapterToDelete = chapters.find((chapter) => chapter.id === chapterId);

    if (!chapterToDelete) {
      return {
        status: "error",
        message: "Chapter not found in the course. Please try again",
        sound: "error",
      };
    }

    const remainingChapters = chapters.filter((chapter) => chapter.id !== chapterId);

    const updates = remainingChapters.map((chapter, index) => {
      // <--- reordering the position
      return prisma.chapter.update({ 
        where: {
          id: chapter.id,
        },

        data: {
          position: index + 1,
        },
      });
    });

    await prisma.$transaction([
      // <--- This is a database transaction is a sequence of operation that are perform as single and atomic unit work...
      ...updates, // <---- Spreading updates...
      prisma.chapter.delete({
        where: {
          id: chapterId,
          // courseId: courseId
        },
      }),
    ]);

    revalidatePath(`/admin/courses/${courseId}/edit`);

    return {
      status: "success",
      message: "Chapter deleted successfully",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to delete Chapter",
      sound: "error",
    };
  }
}