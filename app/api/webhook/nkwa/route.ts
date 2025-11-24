import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createVerify } from "crypto";
import { env } from "@/lib/env";
import logger from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    
    // 1. Get Headers (Case-insensitive handling)
    const signature = headersList.get("x-sig") || headersList.get("x-signature");
    const timestamp = headersList.get("x-timestamp") || headersList.get("date");

    // Debug log to help trace what arrives
    logger.debug({ timestamp, signaturePresent: !!signature }, "Webhook received");

    if (!signature || !timestamp) {
      logger.error({ headers: Object.fromEntries(headersList.entries()) }, "Missing NKWA webhook headers");
      return NextResponse.json(
        { error: "Missing required headers (x-sig or x-timestamp)" },
        { status: 400 }
      );
    }

    // 2. Get Raw Body (Must be text for crypto verification)
    const body = await req.text();

    // 3. Dynamic URL Construction
    // This ensures the verification URL matches exactly what Nkwa sent (https vs http, ngrok vs localhost)
    const host = headersList.get("host"); 
    const protocol = headersList.get("x-forwarded-proto") || "https"; 
    const callbackUrl = `${protocol}://${host}/api/webhook/nkwa`;

    // 4. Reconstruct the Message: Timestamp + URL + Body
    const message = `${timestamp}${callbackUrl}${body}`;

    // 5. Verify Signature
    let publicKey = env.NKWA_PUBLIC_KEY;
    if (publicKey) {
      // CRITICAL FIX: Handle .env newline formatting issues
      publicKey = publicKey.replace(/\\n/g, "\n");
      
      const isValid = verifyWebhookSignature(publicKey, message, signature);

      if (!isValid) {
        logger.warn({ messageHash: message.substring(0, 50) }, "Webhook signature verification failed");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // 6. Parse Body & Process Payment
    const payment = JSON.parse(body);

    if (!payment.id) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 });
    }

    // Log the actual status received
    logger.info({ paymentId: payment.id, paymentStatus: payment.status }, "Payment webhook received");

    const enrollment = await prisma.enrollment.findUnique({
      where: { transactionId: payment.id },
    });

    if (!enrollment) {
      logger.warn({ transactionId: payment.id }, "Enrollment not found for transaction - unable to process payment");
      // Return 200 so Nkwa stops retrying; we can't process a missing enrollment
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // 7. Update Database (Idempotent & Multi-Status Support)
    const statusUpper = payment.status?.toUpperCase();

    // Only update if we are currently Pending to avoid overwriting completed states
    if (enrollment.status === "Pending") {
      
      // FIX: Accept multiple variations of success
      const successStatuses = ["SUCCESSFUL", "SUCCESS", "PAID", "COMPLETED"];
      const failedStatuses = ["FAILED", "CANCELED", "CANCELLED", "DECLINED"];

      if (successStatuses.includes(statusUpper)) {
        const updatedEnrollment = await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Active", // Matches your schema Enum
            paidAt: new Date(),
            rawResponse: payment,
          },
          include: {
            User: true,
            Course: true,
            infrastructure: true,
          },
        });

        // Send payment receipt email
        try {
          const notif = await import("@/lib/notifications");
          const user = (updatedEnrollment.User as any);
          const course = (updatedEnrollment.Course as any);
          await (notif as any).sendPaymentReceipt(user?.email, {
            studentName: user?.name || "Student",
            courseName: course?.title,
            infrastructureName: (updatedEnrollment.infrastructure as any)?.name || "N/A",
            amount: enrollment.amount,
            transactionId: payment.id,
            paymentDate: new Date(),
            nextPaymentDue: updatedEnrollment.nextPaymentDue || new Date(),
          });
        } catch (error) {
          logger.error({ err: error, enrollmentId: enrollment.id }, "Failed to send payment receipt email");
        }

        logger.info({ enrollmentId: enrollment.id }, "Enrollment activated after payment");
      } 
      else if (failedStatuses.includes(statusUpper)) {
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse: payment,
          },
        });
        console.log(`❌ Enrollment ${enrollment.id} cancelled.`);
      }
      else {
        // Use this to catch statuses like "PENDING" and just update the raw log
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { rawResponse: payment }
        });
        console.log(`ℹ️ Status is '${statusUpper}' (not final). Enrollment remains Pending.`);
      }
    } else {
      console.log(`ℹ️ Enrollment ${enrollment.id} is already ${enrollment.status}. Ignoring update.`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook Internal Error:", error);
    // Return 500 so Nkwa retries if it was a server crash
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

function verifyWebhookSignature(
  publicKey: string,
  message: string,
  signatureBase64: string
): boolean {
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    return verifier.verify(publicKey, Buffer.from(signatureBase64, "base64"));
  } catch (error) {
    console.error("Crypto Error:", error);
    return false;
  }
}