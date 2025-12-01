import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: "Notification ID is required" },
        { status: 400 }
      );
    }

    // Notifications are generated dynamically, so just return success
    // In the future, we can store dismissal state in a separate Dismissal model if needed
    logger.info({ notificationId, userId: session.user.id }, "Notification dismissed");
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ err: error }, "Failed to dismiss notification");
    return NextResponse.json(
      { error: "Failed to dismiss notification" },
      { status: 500 }
    );
  }
}
