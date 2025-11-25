import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    await (prisma as any).notification.updateMany({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
      data: { read: true },
    });

    logger.info({ notificationId }, "Notification marked as read");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to update notification");
    return NextResponse.json(
      { error: "Failed to update notification" },
      { status: 500 }
    );
  }
}
