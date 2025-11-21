import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { createVerify } from "crypto";

export async function POST(req: Request) {
  try {
    const headersList = await headers();
    const signature = headersList.get("X-Signature");
    const timestamp = headersList.get("X-Timestamp");

    if (!signature || !timestamp) {
      console.error("Missing signature or timestamp headers");
      return NextResponse.json(
        { error: "Missing required headers" },
        { status: 400 }
      );
    }

    const body = await req.text();
    const payment = JSON.parse(body);

    const callbackUrl = new URL("/api/webhook/nkwa", req.url).toString();
    const message = `${timestamp}${callbackUrl}${body}`;

    const publicKey = process.env.NKWA_PUBLIC_KEY;
    if (publicKey) {
      const isValid = verifyWebhookSignature(
        publicKey,
        message,
        signature
      );

      if (!isValid) {
        console.error("Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }
    }

    console.log("Nkwa webhook received:", {
      paymentId: payment.id,
      status: payment.status,
      amount: payment.amount,
    });

    if (!payment.id) {
      console.error("Payment ID missing from webhook");
      return NextResponse.json(
        { error: "Payment ID required" },
        { status: 400 }
      );
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { transactionId: payment.id },
      include: {
        Course: { select: { title: true } },
        User: { select: { email: true, name: true } },
      },
    });

    if (!enrollment) {
      console.error("Enrollment not found for payment:", payment.id);
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    switch (payment.status) {
      case "success":
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Active",
            paidAt: new Date(),
            rawResponse: payment,
          },
        });
        console.log(
          `Payment successful for enrollment ${enrollment.id}`
        );
        break;

      case "failed":
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse: payment,
          },
        });
        console.log(`Payment failed for enrollment ${enrollment.id}`);
        break;

      case "canceled":
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            status: "Cancelled",
            rawResponse: payment,
          },
        });
        console.log(
          `Payment cancelled for enrollment ${enrollment.id}`
        );
        break;

      case "pending":
        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: {
            rawResponse: payment,
          },
        });
        console.log(
          `Payment still pending for enrollment ${enrollment.id}`
        );
        break;

      default:
        console.warn("Unknown payment status:", payment.status);
        return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function verifyWebhookSignature(
  publicKey: string,
  message: string,
  signatureBase64: string
): boolean {
  try {
    const signature = Buffer.from(signatureBase64, "base64");

    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    
    const publicKeyFormatted = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    
    return verifier.verify(publicKeyFormatted, signature);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
