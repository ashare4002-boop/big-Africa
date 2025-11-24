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

    const rawResponse = JSON.parse(JSON.stringify(payment));

    switch (payment.status) {
      case "success":
        enrollmentStatus = "Active";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Active",
            paidAt: new Date(),
            rawResponse,
          },
        });
        break;

      case "failed":
        enrollmentStatus = "Cancelled";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse,
          },
        });
        break;

      case "canceled":
        enrollmentStatus = "Cancelled";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse,
          },
        });
        break;

      default:
        enrollmentStatus = "Pending";
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            rawResponse,
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
  } catch (error: unknown) {
    const err = error as Record<string, unknown> | null;
    console.error("Error checking payment status:", error);
    return {
      status: "error" as const,
      message: (err?.message as string) || "Failed to check payment status",
    };
  }
}
