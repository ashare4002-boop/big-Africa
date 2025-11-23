"use server";

import { requireUser } from "@/app/data/user/verify-user-session";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { nkwa } from "@/lib/nkwa";
import { ApiResponse } from "@/lib/type";
import logger from "@/lib/logger"; 

// ... (arcjet commented code remains the same)

export async function enrollInCourseAction(
  courseId: string,
  phoneNumber: string
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
      },
    });

    if (!course) {
      logger.warn({ userId: user.id, courseId }, "User attempted to enroll in non-existent course");
      return {
        status: "error",
        message: "Course not found",
        sound: "error",
      };
    }

    if (course.price <= 0) {
      logger.error({ userId: user.id, courseId, price: course.price }, "Enrollment blocked: Course price is zero or negative");
      return {
        status: "error",
        message: "This course is not available for enrollment",
        sound: "error",
      };
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

    // 🚩 RESTORED LOGIC: Declare and conditionally assign 'enrollment'
    let enrollment;
    if (existingEnrollment) {
      enrollment = await prisma.enrollment.update({
        where: { id: existingEnrollment.id },
        data: {
          amount: course.price,
          status: "Pending",
          provider: "nkwa",
          updatedAt: new Date(),
        },
      });
    } else {
      enrollment = await prisma.enrollment.create({
        data: {
          userId: user.id,
          courseId: course.id,
          amount: course.price,
          status: "Pending",
          provider: "nkwa",
        },
      });
    }
    // 🚩 END RESTORED LOGIC
    
    const payment = await nkwa.payments.collect({
      amount: course.price,
      phoneNumber: phoneNumber,
    });
    
    // Log successful payment request setup
    logger.info({ userId: user.id, courseId: course.id, paymentId: payment.id }, "Payment request successfully initiated with Nkwa");

    // This line now correctly uses the 'enrollment' variable
    await prisma.enrollment.update({
      where: { id: enrollment.id }, 
      data: {
        transactionId: payment.id,
        rawResponse: payment as any,
      },
    });

    return { 
      status: "success",
      message: `Payment request sent! Please check your phone (${phoneNumber}) and enter your PIN to complete the payment.`,
      sound: "success",
      data: {
        paymentId: payment.id || "",
      },
    };
  } catch (error: any) {
    // Log the primary error with structured data (user and course)
    logger.error({ userId: user.id, courseId, err: error }, "Enrollment action failed due to provider or server error");

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
      // Log the failure to parse the error body (this indicates an unexpected format)
      logger.warn({ originalError: error.message, parseError: parseErr }, "Failed to parse payment provider error body");
    }

    return {
      status: "error",
      message: userMessage,
      sound: "error",
    };
  }
}