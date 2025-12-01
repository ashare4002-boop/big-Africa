import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processMonthlySubscriptionCheck } from "@/lib/infrastructure-utils";
import logger from "@/lib/logger";
import { env } from "@/lib/env";

/**
 * GET/POST /api/cron/monthly-subscription-check
 * Background job: Check and eject users with overdue infrastructure-based course payments
 * 
 * To be called by external service (e.g., cron-job.org, EasyCron)
 * Should be called once daily
 */
async function handleRequest(request: NextRequest) {
  try {
    // Validate cron secret (if you're using an external cron service)
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Run the monthly subscription check
    await processMonthlySubscriptionCheck();

    // Get stats
    const now = new Date();
    const overdueEnrollments = await prisma.enrollment.findMany({
      where: {
        isEjected: false,
        nextPaymentDue: {
          lt: now,
        },
        infrastructure: {
          isNot: null,
        },
      },
    });

    const ejectedCount = await prisma.enrollment.count({
      where: {
        isEjected: true,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Monthly subscription check completed",
      stats: {
        overdueEnrollmentsFound: overdueEnrollments.length,
        usersEjectedToday: ejectedCount,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, "Monthly subscription check failed");
    return NextResponse.json(
      {
        error: "Failed to process monthly subscription check",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export const GET = handleRequest;
export const POST = handleRequest;
