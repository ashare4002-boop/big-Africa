import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createVerify } from "crypto";
import { env } from "@/lib/env";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    
    // 1. Get Headers (Case-insensitive handling)
    const signature = headersList.get("x-sig") || headersList.get("x-signature");
    const timestamp = headersList.get("x-timestamp") || headersList.get("date");

    // Debug log to help trace what arrives
    console.log(`🪝 Webhook received. Timestamp: ${timestamp}, Signature present: ${!!signature}`);

    if (!signature || !timestamp) {
      console.error("Missing Nkwa Headers:", Object.fromEntries(headersList.entries()));
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
        console.error("❌ Signature Verification Failed");
        console.error("Computed Message:", message);
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // 6. Parse Body & Process Payment
    const payment = JSON.parse(body);

    if (!payment.id) {
      return NextResponse.json({ error: "Payment ID required" }, { status: 400 });
    }

    // Log the actual status received to help you debug
    console.log(`📝 Payment update: ${payment.id} | Status: ${payment.status}`);

    const enrollment = await prisma.enrollment.findUnique({
      where: { transactionId: payment.id },
    });

    if (!enrollment) {
      console.warn(`⚠️ Enrollment not found for transaction: ${payment.id}`);
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
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Active", // Matches your schema Enum
            paidAt: new Date(),
            rawResponse: payment,
          },
        });
        console.log(`✅ Enrollment ${enrollment.id} activated!`);
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