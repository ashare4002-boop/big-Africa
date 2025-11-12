import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

export async function getIndividualCourse(slug: string) {
  const course = await prisma.course.findUnique({
    where: {
      slug: slug,
    },
    select: {
      id: true,
      title: true,
      description: true,
      filekey: true,
      price: true,
      duration: true,
      level: true,
      category: true,
      smallDescription: true,
      courseType: true, // include course type so the public page can react
      chapters: {
        select: {
          id: true,
          title: true,
          lesson: {
            select: {
              id: true,
              title: true,
            },
            orderBy: {
              position: "asc",
            },
          },
        },

        orderBy: {
          position: "asc",
        },
      },

      // For infrastructure-base courses we need towns and infrastructures
      towns: {
        select: {
          id: true,
          name: true,
          infrastructures: {
            select: {
              id: true,
              name: true,
              capacity: true,
              currentEnrollment: true,
              location: true,
              publicContact: true,
              images: true,
              enrollmentDeadline: true,
              openTime: true,
              closeTime: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!course) {
    return notFound();
  }

  return course;
}