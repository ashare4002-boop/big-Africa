import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";
import { getSubscriptionDaysRemaining, isTrialActive, getTrialDaysRemaining } from "@/lib/subscription-utils";

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const type = url.searchParams.get("type");

    // Fetch user subscription data
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        trialStartedAt: true,
        monthlySubscriptionPaidUntil: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications: any[] = [];

    // Generate SUBSCRIPTION_WARNING notifications dynamically
    if (type === "SUBSCRIPTION_WARNING") {
      const trialDaysRemaining = getTrialDaysRemaining(user.trialStartedAt);
      const subscriptionDaysRemaining = getSubscriptionDaysRemaining(user.monthlySubscriptionPaidUntil);
      const isTrialActiveFlag = isTrialActive(user.trialStartedAt);

      // Trial expiring soon (3 days or less)
      if (isTrialActiveFlag && trialDaysRemaining <= 3 && trialDaysRemaining > 0) {
        notifications.push({
          id: `trial-warning-${session.user.id}`,
          title: "Trial Ending Soon",
          message: `Your 7-day free trial expires in ${trialDaysRemaining} day(s). Prepare to pay 1,000 XAF/month for continuous access.`,
          daysRemaining: trialDaysRemaining,
          read: false,
        });
      }

      // Subscription expiring soon (3 days or less)
      if (
        !isTrialActiveFlag &&
        user.monthlySubscriptionPaidUntil &&
        subscriptionDaysRemaining <= 3 &&
        subscriptionDaysRemaining > 0
      ) {
        notifications.push({
          id: `subscription-warning-${session.user.id}`,
          title: "Subscription Expiring Soon",
          message: `Your subscription expires in ${subscriptionDaysRemaining} day(s). Renew now to maintain access.`,
          daysRemaining: subscriptionDaysRemaining,
          amountDue: 1000,
          read: false,
        });
      }
    }

    return NextResponse.json({
      notifications,
      unreadCount: notifications.length,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to fetch notifications");
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
