import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { startTrialForUser } from "@/lib/subscription-utils";
import logger from "@/lib/logger";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Initialize trial for new users on first signup
 * Called after successful email OTP or Google OAuth verification
 */
export async function POST() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      logger.warn({ userId: "unknown" }, "Trial init: No session found");
      return NextResponse.json({ status: "no_session" });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, trialStartedAt: true, monthlySubscriptionPaidUntil: true },
    });

    if (!user) {
      logger.warn({ userId: session.user.id }, "Trial init: User not found");
      return NextResponse.json({ status: "user_not_found" }, { status: 404 });
    }

    // Skip if admin/staff
    if (["admin", "staff"].includes((user.role || "").toLowerCase())) {
      logger.info({ userId: session.user.id }, "Trial init: Skipped - admin/staff role");
      return NextResponse.json({ status: "skipped_admin" });
    }

    // Skip if trial already started
    if (user.trialStartedAt) {
      logger.info({ userId: session.user.id }, "Trial init: Skipped - trial already started");
      return NextResponse.json({ status: "trial_already_started" });
    }

    // Skip if already has active subscription
    if (user.monthlySubscriptionPaidUntil && new Date(user.monthlySubscriptionPaidUntil) > new Date()) {
      logger.info({ userId: session.user.id }, "Trial init: Skipped - has active subscription");
      return NextResponse.json({ status: "has_subscription" });
    }

    // Start trial
    await startTrialForUser(session.user.id);
    logger.info({ userId: session.user.id }, "Trial initialized for new user");

    return NextResponse.json({ status: "trial_started" });
  } catch (error) {
    logger.error({ err: error }, "Trial initialization failed");
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
