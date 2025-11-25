import "server-only"; 

import { prisma } from "@/lib/db";
import { requireAdmin } from "./require-admin";

export async function adminGetDashboardStats() {
  await requireAdmin();

  const [totalSignup, totalCustomers, totalCourses, totalLessons, totalInfrastructure] = await Promise.all([
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

    // Total infrastructure
    prisma.infrastructure.count(),
  ]);

  // Calculate total earnings from infrastructure-based course enrollments
  const infrastructureEnrollments = await prisma.enrollment.findMany({
    where: {
      infrastructureId: {
        not: null,
      },
      status: "Active",
    },
    select: {
      amount: true,
    },
  });

  const totalEarnings = infrastructureEnrollments.reduce((sum: number, enrollment) => sum + (enrollment.amount || 0), 0);

  return {
    totalSignup,
    totalCustomers,
    totalCourses,
    totalLessons,
    totalInfrastructure,
    totalEarnings,
  }
}
