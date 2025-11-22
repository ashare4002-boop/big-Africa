import "server-only"; 

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function adminGetDashboardStats() {
  await requireAdmin();

  const [totalSignup, totalCustomers, totalCourses, totalLessons] = await Promise.all([
    // Total signup
    prisma.user.count(),

    //Total customers
    prisma.user.count({
      where: {
        enrollment: {
          some: {},
        },
      },
    }),

    // Total courses
    prisma.course.count(),

    //Total lessons
    prisma.lesson.count(),
  ]);

  return {
    totalSignup,
    totalCustomers,
    totalCourses,
    totalLessons
  }
}
