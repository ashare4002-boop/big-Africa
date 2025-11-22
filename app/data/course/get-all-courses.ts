import "server-only"; 

import { prisma } from "@/lib/db";

export async function getAllCourses() {
    await new Promise ((resolve) => setTimeout(resolve, 2000)); // <---| Comment this line out or remove it in production
    const data = await prisma.course.findMany({
      where: {
        status: "Published"
      },

      orderBy: {
        createdAt: "desc",
      },
        select: {
            title: true,
            price: true,
            smallDescription: true,
            slug: true,
            filekey: true,
            id: true,
            level: true,
            duration: true,
            category: true,
        },
    });

    return data;
}


 export type PublicCoursesType = Awaited<ReturnType<typeof getAllCourses>>[0];