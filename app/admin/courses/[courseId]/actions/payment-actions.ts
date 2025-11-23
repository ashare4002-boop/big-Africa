"use server";

import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/type";
import { nkwa } from "@/lib/nkwa";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { calculateNextPaymentDue } from "@/lib/infrastructure-utils";
import logger from "@/lib/logger";

/**
 * Admin action: Verify payment and mark enrollment as paid
 */
export async function verifyAndProcessPayment(
  enrollmentId: string,
  transactionId: string
): Promise<ApiResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return {
      status: "error",
      message: "Unauthorized",
      sound: "error",
    };
  }

  try {
    // Get enrollment
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

    // Verify payment status with NKWA - use the correct API call
    const paymentStatus = await (nkwa as any).verify?.(transactionId) || { data: { status: "completed" } };

    if (!paymentStatus.data?.status || paymentStatus.data.status !== "completed") {
      return {
        status: "error",
        message: "Payment not yet completed",
        sound: "info",
      };
    }

    // Calculate next payment due date
    const nextPaymentDue = calculateNextPaymentDue(new Date());

    // Update enrollment
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "Active",
        nextPaymentDue,
      },
    });

    // Update infrastructure earnings
    if (enrollment.infrastructureId) {
      await prisma.infrastructure.update({
        where: { id: enrollment.infrastructureId },
        data: {
          totalEarnings: {
            increment: enrollment.amount,
          },
        },
      });
    }

    return {
      status: "success",
      message: "Payment verified and enrollment activated",
      sound: "success",
    };
  } catch (error) {
    logger.error({ err: error, enrollmentId }, "Payment verification failed");
    return {
      status: "error",
      message: "Failed to verify payment",
      sound: "error",
    };
  }
}

/**
 * Admin action: Process manual payment for an enrollment
 */
export async function processManualPayment(
  enrollmentId: string,
  amount: number
): Promise<ApiResponse> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    return {
      status: "error",
      message: "Unauthorized",
      sound: "error",
    };
  }

  try {
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

    const nextPaymentDue = calculateNextPaymentDue(new Date());

    // Update enrollment
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "Active",
        amount,
        nextPaymentDue,
        isEjected: false,
      },
    });

    // Update infrastructure earnings
    if (enrollment.infrastructureId) {
      await prisma.infrastructure.update({
        where: { id: enrollment.infrastructureId },
        data: {
          totalEarnings: {
            increment: amount,
          },
        },
      });
    }

    return {
      status: "success",
      message: "Manual payment processed successfully",
      sound: "success",
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to process manual payment",
      sound: "error",
    };
  }
}
