"use server";

import { requireUser } from "@/app/data/user/verify-user-session";
import { prisma } from "@/lib/db";
import { nkwa } from "@/lib/nkwa";
import { ApiResponse } from "@/lib/type";
import logger from "@/lib/logger";

// const aj = arcjet.withRule(
//   fixedWindow({ Time: -----> 6:48:54
//     mode: "LIVE",
//     window: "1m",
//     max: 5,
//   })
// );

export async function enrollInCourseAction(
  courseId: string,
  phoneNumber: string,
  infrastructureId?: string,
  townId?: string
): Promise<ApiResponse<{ paymentId: string }>> {
  const user = await requireUser();

  try {
    
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        title: true,
        price: true,
        slug: true,
        duration: true,
        courseType: true,
      },
    });

    if (!course) {
      return {
        status: "error",
        message: "Course not found",
        sound: "error",
      };
    }

    if (course.price <= 0) {
      return {
        status: "error",
        message: "This course is not available for enrollment",
        sound: "error",
      };
    }

    // For infrastructure-based courses, validate infrastructure selection
    if (course.courseType === "INFRASTRUCTURE_BASE") {
      if (!infrastructureId || !townId) {
        return {
          status: "error",
          message: "Please select an infrastructure and town",
          sound: "error",
        };
      }

      // Verify infrastructure exists and is available
      const infrastructure = await prisma.infrastructure.findUnique({
        where: { id: infrastructureId },
        select: { capacity: true, currentEnrollment: true, enrollmentDeadline: true },
      });

      if (!infrastructure) {
        return {
          status: "error",
          message: "Selected infrastructure not found",
          sound: "error",
        };
      }

      if (infrastructure.currentEnrollment >= infrastructure.capacity) {
        return {
          status: "error",
          message: "Selected infrastructure is full",
          sound: "error",
        };
      }

      if (infrastructure.enrollmentDeadline && new Date() > new Date(infrastructure.enrollmentDeadline)) {
        return {
          status: "error",
          message: "Enrollment deadline for this infrastructure has passed",
          sound: "error",
        };
      }
    }

    const phoneRegex = /^237[6-7]\d{8}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return {
        status: "error",
        message: "Invalid phone number. Format: 237XXXXXXXXX (Cameroon)",
        sound: "error",
      };
    }

    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId: user.id,
          courseId: courseId,
        },
      },
      select: {
        status: true,
        id: true,
      },
    });

    if (existingEnrollment?.status === "Active") {
      return {
        status: "error",
        message: "You are already enrolled in this course",
        sound: "info",
      };
    }

    // Calculate payment amount (for infrastructure courses, it's monthly)
    const monthlyPayment = course.courseType === "INFRASTRUCTURE_BASE" && course.duration
      ? Math.ceil(course.price / course.duration)
      : course.price;

    let enrollment;
    if (existingEnrollment) {
      enrollment = await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          amount: monthlyPayment,
          status: "Pending",
          provider: "nkwa",
          infrastructureId: infrastructureId || null,
          updatedAt: new Date(),
        },
      });
    } else {
      enrollment = await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          amount: monthlyPayment,
          status: "Pending",
          provider: "nkwa",
          infrastructureId: infrastructureId || undefined,
        },
      });
    }

    const payment = await nkwa.payments.collect({
      amount: monthlyPayment,
      phoneNumber: phoneNumber,
    });

    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        transactionId: payment.id,
        rawResponse: payment as any,
      },
      include: {
        infrastructure: {
          include: {
            town: true,
          },
        },
        User: true,
        Course: true,
      },
    });

    // Send student enrollment confirmation email
    try {
      const notif = await import("@/lib/notifications");
      const user = (updatedEnrollment.User as any);
      const courseData = (updatedEnrollment.Course as any);
      const infra = (updatedEnrollment.infrastructure as any);
      const town = infra?.town as any;
      
      const paymentLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'https://a-share.dev'}/enrollment/${updatedEnrollment.id}/pay`;
      
      await (notif as any).sendStudentEnrollmentConfirmation(user?.email, {
        studentName: user?.name || "Student",
        courseName: courseData?.title,
        infrastructureName: infra?.name || "N/A",
        town: town?.name || "N/A",
        monthlyFee: monthlyPayment,
        paymentLink: paymentLink,
      });
    } catch (error) {
      logger.error({ err: error, enrollmentId: enrollment.id }, "Failed to send student enrollment confirmation");
    }

    return {
      status: "success",
      message: `Payment request sent! Please check your phone (${phoneNumber}) and enter your PIN to complete the payment.`,
      sound: "success",
      data: {
        paymentId: payment.id || "",
      },
    };
  } catch (error: any) {
    // Improve error reporting for Nkwa SDK HttpError
    console.error("Enrollment error:", error);

    // Try to extract useful info from HttpError body
    let userMessage = "Failed to process enrollment. Please try again.";
    try {
      if (error?.body) {
        // body may be a JSON string
        const parsed = typeof error.body === "string" ? JSON.parse(error.body) : error.body;
        if (parsed?.message) {
          userMessage = `Payment provider error: ${parsed.message}`;
        } else if (parsed?.error) {
          userMessage = `Payment provider error: ${parsed.error}`;
        }
      } else if (error?.message) {
        userMessage = error.message;
      }
    } catch (parseErr) {
      console.error("Failed to parse provider error body:", parseErr);
    }

    return {
      status: "error",
      message: userMessage,
      sound: "error",
    };
  }
}
