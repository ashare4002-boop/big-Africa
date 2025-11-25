import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse, NextRequest } from "next/server";
import { createVerify } from "crypto";
import { env } from "@/lib/env";
import logger from "@/lib/logger";
import { processMonthlySubscriptionPayment } from "@/lib/subscription-utils";

/**
 * UNIFIED NKWA WEBHOOK HANDLER
 * 
 * This single endpoint handles BOTH:
 * 1. Infrastructure-based course payments (reference: INFRASTRUCTURE_BASED_*)
 * 2. Platform subscription payments (reference: MONTHLY_SUB_*)
 * 
 * Configure ONLY this URL in NKWA dashboard: /api/webhook/nkwa
 */
export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();

    // 1. Get NKWA Webhook Headers
    const signature = headersList.get("x-sig") || headersList.get("x-signature");
    const timestamp = headersList.get("x-timestamp") || headersList.get("date");

    if (!signature || !timestamp) {
      logger.error({ headers: Object.fromEntries(headersList.entries()) }, "Missing NKWA webhook headers");
      return NextResponse.json(
        { error: "Missing required headers (x-sig or x-timestamp)" },
        { status: 400 }
      );
    }

    // 2. Get Raw Body (Must be text for RSA-SHA256 verification)
    const body = await req.text();

    // 3. Dynamic URL Construction (handle https/http, proxies, etc)
    const host = headersList.get("host");
    const protocol = headersList.get("x-forwarded-proto") || "https";
    const callbackUrl = `${protocol}://${host}/api/webhook/nkwa`;

    // 4. Reconstruct the Message for Verification
    const message = `${timestamp}${callbackUrl}${body}`;

    // 5. Verify RSA-SHA256 Signature
    let publicKey = env.NKWA_PUBLIC_KEY;
    if (publicKey) {
      publicKey = publicKey.replace(/\\n/g, "\n");
      const isValid = verifyWebhookSignature(publicKey, message, signature);

      if (!isValid) {
        logger.warn({ messageHash: message.substring(0, 50) }, "Webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // 6. Parse Payment Data
    const payment = JSON.parse(body);

    if (!payment.id) {
      logger.warn("Missing payment ID in webhook");
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 });
    }

    logger.info({ paymentId: payment.id, status: payment.status, reference: payment.reference }, "NKWA webhook received");

    // 7. ROUTE based on payment reference type
    const reference = payment.reference || "";

    if (reference.startsWith("MONTHLY_SUB_")) {
      //  Route to subscription handler
      return await handleSubscriptionPayment(payment);
    } else if (reference.startsWith("INFRASTRUCTURE_BASED_") || reference.includes("_COURSE_")) {
      //  Route to infrastructure handler
      return await handleInfrastructurePayment(payment);
    } else {
      logger.warn({ reference, paymentId: payment.id }, "Unknown payment reference format");
      return NextResponse.json({ received: true }, { status: 200 });
    }
  } catch (error) {
    logger.error({ err: error }, "Webhook processing error");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * Handle platform subscription payments (monthly)
 */
async function handleSubscriptionPayment(payment: any) {
  try {
    const reference = payment.reference || "";
    const statusUpper = payment.status?.toUpperCase();
    const successStatuses = ["SUCCESSFUL", "SUCCESS", "PAID", "COMPLETED"];
    const failedStatuses = ["FAILED", "CANCELED", "CANCELLED", "DECLINED"];

    // Check if payment is in final state
    if (!successStatuses.includes(statusUpper) && !failedStatuses.includes(statusUpper)) {
      logger.info({ reference, status: statusUpper }, "Subscription payment not in final state");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Extract userId from reference (format: MONTHLY_SUB_{userId}_{timestamp})
    const match = reference.match(/MONTHLY_SUB_([a-zA-Z0-9_-]+)_/);
    const userId = match?.[1];

    if (!userId) {
      logger.error({ reference }, "Could not extract userId from subscription reference");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      logger.error({ userId }, "User not found for subscription payment");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Process payment based on status
    if (successStatuses.includes(statusUpper)) {
      await processMonthlySubscriptionPayment(userId);
      logger.info(
        { userId, reference, amount: payment.amount },
        "✅ Subscription payment processed successfully"
      );
    } else if (failedStatuses.includes(statusUpper)) {
      logger.warn({ userId, reference, status: statusUpper }, "Subscription payment failed");
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Subscription payment handler error");
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

/**
 * Handle infrastructure-based course payments
 */
async function handleInfrastructurePayment(payment: any) {
  try {
    const statusUpper = payment.status?.toUpperCase();
    const successStatuses = ["SUCCESSFUL", "SUCCESS", "PAID", "COMPLETED"];
    const failedStatuses = ["FAILED", "CANCELED", "CANCELLED", "DECLINED"];

    // Find enrollment by transaction ID
    const enrollment = await prisma.enrollment.findUnique({
      where: { transactionId: payment.id },
    });

    if (!enrollment) {
      logger.warn({ transactionId: payment.id }, "Enrollment not found for infrastructure payment");
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Only update if enrollment is still pending
    if (enrollment.status === "Pending") {
      if (successStatuses.includes(statusUpper)) {
        // Calculate next payment due (30 days from now)
        const nextPaymentDue = new Date();
        nextPaymentDue.setDate(nextPaymentDue.getDate() + 30);

        const updatedEnrollment = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Active",
            paidAt: new Date(),
            nextPaymentDue: nextPaymentDue,
            rawResponse: payment,
          },
          include: {
            User: true,
            Course: true,
            infrastructure: {
              include: {
                town: true,
              },
            },
          },
        });

        // Increment infrastructure current enrollment if applicable
        if (updatedEnrollment.infrastructure) {
          await prisma.infrastructure.update({
            where: { id: updatedEnrollment.infrastructure.id },
            data: {
              currentEnrollment: {
                increment: 1,
              },
            },
          });
        }

        // Send payment receipt email
        try {
          const notif = await import("@/lib/notifications");
          const user = updatedEnrollment.User as any;
          const course = updatedEnrollment.Course as any;
          await (notif as any).sendPaymentReceipt(user?.email, {
            studentName: user?.name || "Student",
            courseName: course?.title,
            infrastructureName: (updatedEnrollment.infrastructure as any)?.name || "N/A",
            amount: enrollment.amount,
            transactionId: payment.id,
            paymentDate: new Date(),
            nextPaymentDue: nextPaymentDue,
          });
        } catch (error) {
          logger.error({ err: error, enrollmentId: enrollment.id }, "Failed to send payment receipt email");
        }

        // Send infrastructure owner notification
        if (updatedEnrollment.infrastructure) {
          try {
            const notif = await import("@/lib/notifications");
            const infra = updatedEnrollment.infrastructure as any;
            const user = updatedEnrollment.User as any;
            const course = updatedEnrollment.Course as any;
            const town = (infra.town as any);

            const totalEnrolled = await prisma.infrastructure.findUnique({
              where: { id: infra.id },
              select: { currentEnrollment: true },
            });

            await (notif as any).sendInfrastructureOwnerNotification(infra.publicContact, {
              studentName: user?.name || "Student",
              studentEmail: user?.email || "N/A",
              courseName: course?.title,
              infrastructureName: infra.name,
              town: town?.name || "N/A",
              monthlyFee: enrollment.amount,
            });
          } catch (error) {
            logger.error({ err: error, enrollmentId: enrollment.id }, "Failed to send infrastructure notification");
          }
        }

        logger.info({ enrollmentId: enrollment.id }, " Infrastructure enrollment activated after payment");
      } else if (failedStatuses.includes(statusUpper)) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse: payment,
          },
        });
        logger.info({ enrollmentId: enrollment.id }, "Infrastructure enrollment cancelled due to payment failure");
      } else {
        // Payment pending - just log
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { rawResponse: payment },
        });
        logger.info({ enrollmentId: enrollment.id }, "⏳ Infrastructure payment still pending");
      }
    } else {
      logger.info({ enrollmentId: enrollment.id, currentStatus: enrollment.status }, "Infrastructure enrollment already processed, skipping");
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    logger.error({ err: error }, "Infrastructure payment handler error");
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

/**
 * Verify RSA-SHA256 webhook signature
 */
function verifyWebhookSignature(publicKey: string, message: string, signatureBase64: string): boolean {
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    return verifier.verify(publicKey, Buffer.from(signatureBase64, "base64"));
  } catch (error) {
    logger.error({ err: error }, "Signature verification error");
    return false;
  }
}
