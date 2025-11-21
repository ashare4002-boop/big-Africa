"use server";

import { requireUser } from "@/app/data/user/verify-user-session";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { nkwa } from "@/lib/nkwa";
import { ApiResponse } from "@/lib/type";

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

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

    const payment = await nkwa.payments.collect({
      amount: course.price,
      phoneNumber: phoneNumber,
    });

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
    console.error("Enrollment error:", error);
    return {
      status: "error",
      message: error?.message || "Failed to process enrollment. Please try again.",
      sound: "error",
    };
  }
}
