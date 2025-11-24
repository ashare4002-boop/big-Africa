import "server-only";
import { requireAdmin } from "./require-admin";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function adminGetCourse(id: string) {
  await requireAdmin();

  const data = await prisma.course.findUnique({
    where: {
      id: id,
    },

    select: {
      id: true,
      title: true,
      smallDescription: true,
      duration: true,
      level: true,
      status: true,
      price: true,
      filekey: true,
      slug: true,
      category: true,
      description: true,
      courseType: true,

      chapters: {
        
        select: {
          id: true,
          title: true,
          position: true,

          lesson: {
            select: {
              id: true,
              title: true,
              description: true,
              position: true,

            },
          },
        },
      },
    },
  });

  if (!data) {
    return notFound();
  }

  return data;
}

export type AdminCourseSingularType = Awaited<ReturnType<typeof adminGetCourse>>; // <---- infer type
