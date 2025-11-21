"use server";

import { nkwa } from "@/lib/nkwa";
import { prisma } from "@/lib/db";

export async function checkPaymentStatus(paymentId: string) {
  try {
    const payment = await nkwa.payments.get({ id: paymentId });

    const enrollment = await prisma.enrollment.findUnique({
      where: { transactionId: paymentId },
      include: {
        Course: { select: { title: true, slug: true } },
      },
    });

    if (!enrollment) {
      return {
        status: "error" as const,
        message: "Enrollment not found",
      };
    }

    let enrollmentStatus: "Pending" | "Active" | "Cancelled" | "Paid";

    switch (payment.status) {
      case "success":
        enrollmentStatus = "Active";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Active",
            paidAt: new Date(),
            rawResponse: payment as any,
          },
        });
        break;

      case "failed":
        enrollmentStatus = "Cancelled";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse: payment as any,
          },
        });
        break;

      case "canceled":
        enrollmentStatus = "Cancelled";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse: payment as any,
          },
        });
        break;

      default:
        enrollmentStatus = "Pending";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            rawResponse: payment as any,
          },
        });
    }

    return {
      status: "success" as const,
      paymentStatus: payment.status,
      enrollmentStatus,
      courseTitle: enrollment.Course.title,
      courseSlug: enrollment.Course.slug,
    };
  } catch (error: any) {
    console.error("Error checking payment status:", error);
    return {
      status: "error" as const,
      message: error?.message || "Failed to check payment status",
    };
  }
}
