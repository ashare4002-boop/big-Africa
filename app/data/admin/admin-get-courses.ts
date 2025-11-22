import "server-only"; 


import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";


export async function adminGetCourses() {
  await new Promise ((resolve) => setTimeout(resolve, 2000)); // <---| Comment this line out or remove it in production
  await requireAdmin();

  const data = prisma.course.findMany({
    orderBy: {
      createdAt: "desc",
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
       
    },
  });

  return data;
}

export type AdminCourseType = Awaited<ReturnType<typeof adminGetCourses>>[0]; // infer the type....
