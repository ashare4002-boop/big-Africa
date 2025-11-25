"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/type";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { request } from "@arcjet/next";
import logger from "@/lib/logger";

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 20,
  })
);

/**
 * Admin endpoint: Get all enrollments for a specific infrastructure-based course
 */
export async function getCourseEnrollments(courseId: string): Promise<ApiResponse<{ course: unknown }>> {
  await requireAdmin();

  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        enrollment: {
          include: {
            User: true,
            infrastructure: {
              include: {
                town: true,
              },
            },
          },
        },
        towns: {
          include: {
            infrastructures: true,
          },
        },
      },
    });

    if (!course) {
      return {
        status: "error",
        message: "Course not found",
        sound: "error",
      };
    }

    return {
      status: "success" as const,
      message: "Enrollments retrieved",
      data: {
        course,
      },
      sound: "success" as const,
    };
  } catch (_error) {
    return {
      status: "error",
      message: "Failed to fetch enrollments",
      sound: "error",
    };
  }
}

/**
 * Admin endpoint: Override user infrastructure selection
 */
export async function overrideUserInfrastructure(
  enrollmentId: string,
  newInfrastructureId: string
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Rate limit exceeded",
        sound: "info",
      };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { infrastructure: true },
    });

    if (!enrollment) {
      return {
        status: "error",
        message: "Enrollment not found",
        sound: "error",
      };
    }

    // OPTIMIZATION: Batch all infrastructure and enrollment updates in a transaction
    await prisma.$transaction(async (tx) => {
      // Decrease old infrastructure enrollment
      if (enrollment.infrastructureId) {
        await tx.infrastructure.update({
          where: { id: enrollment.infrastructureId },
          data: {
            currentEnrollment: {
              decrement: 1,
            },
          },
        });
      }

      // Increase new infrastructure enrollment
      await tx.infrastructure.update({
        where: { id: newInfrastructureId },
        data: {
          currentEnrollment: {
            increment: 1,
          },
        },
      });

      // Update enrollment
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          infrastructureId: newInfrastructureId,
        },
      });
    });

    return {
      status: "success",
      message: "Infrastructure assignment updated",
      sound: "success",
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to override infrastructure",
      sound: "error",
    };
  }
}

/**
 * Admin endpoint: Manually unlock a user for re-enrollment
 */
export async function unlockUserForReEnrollment(enrollmentId: string): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Rate limit exceeded",
        sound: "info",
      };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      return {
        status: "error",
        message: "Enrollment not found",
        sound: "error",
      };
    }

    if (!enrollment.isEjected) {
      return {
        status: "error",
        message: "User is not ejected",
        sound: "info",
      };
    }

    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        isEjected: false,
        status: "Active",
      },
    });

    return {
      status: "success",
      message: "User unlocked for re-enrollment",
      sound: "success",
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to unlock user",
      sound: "error",
    };
  }
}

/**
 * Admin endpoint: Block/eject an active user from re-enrollment
 */
export async function blockUserForReEnrollment(enrollmentId: string): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Rate limit exceeded",
        sound: "info",
      };
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { infrastructure: true },
    });

    if (!enrollment) {
      return {
        status: "error",
        message: "Enrollment not found",
        sound: "error",
      };
    }

    if (enrollment.isEjected) {
      return {
        status: "error",
        message: "User is already ejected",
        sound: "info",
      };
    }

    // Batch update enrollment and decrement infrastructure in transaction
    await prisma.$transaction(async (tx) => {
      await tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          isEjected: true,
          ejectionCount: enrollment.ejectionCount + 1,
          status: "Cancelled",
        },
      });

      if (enrollment.infrastructureId) {
        await tx.infrastructure.update({
          where: { id: enrollment.infrastructureId },
          data: {
            currentEnrollment: { decrement: 1 },
          },
        });
      }
    });

    return {
      status: "success",
      message: "User blocked from re-enrollment",
      sound: "success",
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to block user",
      sound: "error",
    };
  }
}

/**
 * Get infrastructure capacity and earnings analytics
 */
export async function getInfrastructureAnalytics(courseId: string): Promise<ApiResponse<{ analytics: unknown[] }>> {
  const session = await requireAdmin();

  try {
    const infrastructures = await prisma.infrastructure.findMany({
      where: {
        town: {
          courseId,
        },
      },
      include: {
        town: true,
        enrollment: {
          include: {
            User: true,
          },
        },
      },
    });

    const analytics = await Promise.all(
      infrastructures.map(async (infra) => {
        const isLocked = infra.isLocked;
        const activeEnrollments = (infra.enrollment as any[]).filter((e: any) => !e.isEjected);
        const ejectedUsers = (infra.enrollment as any[]).filter((e: any) => e.isEjected);

        return {
          id: infra.id,
          name: infra.name,
          town: (infra.town as any).name,
          capacity: infra.capacity,
          currentEnrollment: infra.currentEnrollment,
          availableSpots: infra.capacity - infra.currentEnrollment,
          isLocked,
          status: isLocked ? "LOCKED" : infra.currentEnrollment >= infra.capacity ? "FULL" : "OPEN",
          totalEarnings: infra.totalEarnings,
          ownerPhoneNumber: infra.ownerPhoneNumber,
          activeEnrollmentsCount: activeEnrollments.length,
          ejectedUsersCount: ejectedUsers.length,
          enrolledStudents: activeEnrollments.map((e: any) => ({
            id: e.userId,
            enrollmentId: e.id,
            name: (e.User as any).name,
            email: (e.User as any).email,
            enrolledAt: e.createdAt,
            nextPaymentDue: e.nextPaymentDue,
            isEjected: false,
          })),
          ejectedStudents: ejectedUsers.map((e: any) => ({
            id: e.userId,
            enrollmentId: e.id,
            name: (e.User as any).name,
            email: (e.User as any).email,
            ejectedAt: e.updatedAt,
            ejectionCount: e.ejectionCount,
            isEjected: true,
          })),
        };
      })
    );

    return {
      status: "success" as const,
      message: "Analytics retrieved",
      data: { analytics },
      sound: "success" as const,
    };
  } catch (error) {
    logger.error({ err: error }, "Analytics error");
    return {
      status: "error",
      message: "Failed to fetch analytics",
      sound: "error",
    };
  }
}
