"use server";

import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/type";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { request } from "@arcjet/next";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { calculateNextPaymentDue } from "@/lib/infrastructure-utils";
import * as notif from "@/lib/notifications";
import logger from "@/lib/logger";

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 10,
  })
);

/**
 * Student endpoint: Enroll in an infrastructure-based course
 */
export async function enrollInInfrastructureBaseCourse(
  courseId: string,
  infrastructureId: string,
  _townId: string
): Promise<ApiResponse<{ enrollmentId: string }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      status: "error",
      message: "You must be logged in to enroll",
      sound: "error",
    };
  }

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

    // Verify course exists and is infrastructure-based
    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return {
        status: "error",
        message: "Course not found",
        sound: "error",
      };
    }

    if (course.courseType !== "INFRASTRUCTURE_BASE") {
      return {
        status: "error",
        message: "This is not an infrastructure-based course",
        sound: "error",
      };
    }

    // Verify infrastructure exists and is not locked
    const infrastructure = await prisma.infrastructure.findUnique({
      where: { id: infrastructureId },
    });

    if (!infrastructure) {
      return {
        status: "error",
        message: "Infrastructure not found",
        sound: "error",
      };
    }

    const isLocked = await (async () => {
      if (infrastructure.isLocked === true) return true;
      if (infrastructure.currentEnrollment >= infrastructure.capacity) return true;
      if (infrastructure.enrollmentDeadline && new Date() > infrastructure.enrollmentDeadline) return true;
      return false;
    })();

    if (isLocked) {
      return {
        status: "error",
        message: "This infrastructure is no longer accepting enrollments",
        sound: "error",
      };
    }

    // Check if user already enrolled in this course
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        userId: session.user.id,
        courseId,
      },
    });

    if (existingEnrollment) {
      return {
        status: "error",
        message: "You are already enrolled in this course",
        sound: "info",
      };
    }

    // Create enrollment
    const nextPaymentDue = calculateNextPaymentDue(new Date());

    // OPTIMIZATION: Batch enrollment creation and infrastructure update in transaction
    const enrollment = await prisma.$transaction(async (tx) => {
      const newEnrollment = await tx.enrollment.create({
        data: {
          userId: session.user.id,
          courseId,
          infrastructureId,
          status: "Pending",
          provider: "nkwa",
          amount: course.price,
          nextPaymentDue,
          isEjected: false,
          ejectionCount: 0,
        },
      });

      // Increment infrastructure enrollment count in same transaction
      await tx.infrastructure.update({
        where: { id: infrastructureId },
        data: {
          currentEnrollment: {
            increment: 1,
          },
        },
      });

      return newEnrollment;
    });

    // OPTIMIZATION: Send notifications asynchronously without blocking response
    notif.sendInfrastructureOwnerNotification(infrastructure.publicContact, {
      studentName: session.user.name || "Student",
      studentEmail: session.user.email,
      courseName: course.title,
      infrastructureName: infrastructure.name,
      town: "TBD",
      monthlyFee: course.price,
    }).catch(err => logger.error({ err }, "Failed to send infrastructure owner notification"));

    // NOTE: Do NOT send student confirmation email here. For infrastructure-based courses,
    // only the payment receipt email should be sent after successful payment via webhook.
    // This prevents double-payment issues if students click "Complete Payment" in the confirmation email.
    // The payment receipt (sendPaymentReceipt) is sent after NKWA webhook confirms successful payment.

    return {
      status: "success" as const,
      message: "Successfully enrolled in course. Payment required.",
      data: { enrollmentId: enrollment.id },
      sound: "success" as const,
    };
  } catch (error) {
    logger.error({ err: error }, "Enrollment error");
    return {
      status: "error",
      message: "Failed to enroll in course",
      sound: "error",
    };
  }
}

/**
 * Student endpoint: Get their infrastructure-based course enrollments
 */
export async function getUserInfrastructureEnrollments(): Promise<ApiResponse<{ enrollments: any[] }>> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      status: "error",
      message: "You must be logged in",
      sound: "error",
    };
  }

  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        userId: session.user.id,
        infrastructure: {
          isNot: null,
        },
      },
      include: {
        Course: true,
        infrastructure: {
          include: {
            town: true,
          },
        },
      },
    });

    return {
      status: "success" as const,
      message: "Enrollments retrieved",
      data: { enrollments },
      sound: "success" as const,
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to fetch enrollments",
      sound: "error",
    };
  }
}
