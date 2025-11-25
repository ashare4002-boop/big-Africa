import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";
import { nkwa } from "@/lib/nkwa";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { hasActiveMonthlySubscription } from "@/lib/subscription-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { redirectUrl } = await request.json();

    // Fetch user and check current subscription status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, role: true, monthlySubscriptionPaidUntil: true, trialStartedAt: true },
    });

    if (!user) {
      logger.error({ userId: session.user.id }, "User not found");
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // VALIDATION: Don't charge if user already has active subscription
    if (hasActiveMonthlySubscription(user.monthlySubscriptionPaidUntil, user.role)) {
      logger.warn({ userId: user.id }, "User attempted to pay but already has active subscription");
      return NextResponse.json(
        { message: "You already have an active subscription" },
        { status: 400 }
      );
    }

    // Initialize NKWA payment
    const reference = `MONTHLY_SUB_${user.id}_${Date.now()}`;
    
    const paymentResponse = await (nkwa as any).initializePayment({
      amount: 1000, // 1000 XAF
      reference,
      description: "A-Share Platform Monthly Subscription",
      email: user.email,
      currency: "XAF",
    });

    if (!paymentResponse || !paymentResponse.data) {
      logger.error({ userId: user.id, reference }, "Failed to initialize NKWA payment");
      return NextResponse.json(
        { message: "Unable to process payment at this time" },
        { status: 500 }
      );
    }

    const paymentLink = (paymentResponse.data as any)?.payment_link || (paymentResponse.data as any)?.payment_url;
    
    if (!paymentLink) {
      logger.error({ userId: user.id, reference }, "No payment link in NKWA response");
      return NextResponse.json(
        { message: "Unable to process payment at this time" },
        { status: 500 }
      );
    }

    logger.info({ userId: user.id, reference }, "Subscription payment initiated");
    return NextResponse.json({ paymentLink });
  } catch (error) {
    logger.error({ err: error }, "Subscription payment error");
    return NextResponse.json(
      { message: "Payment error" },
      { status: 500 }
    );
  }
}
