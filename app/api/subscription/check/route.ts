import { auth } from "@/lib/auth";
import { userNeedsToPayForSubscription } from "@/lib/subscription-utils";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ needsPayment: false });
    }

    const needsPayment = await userNeedsToPayForSubscription(session.user.id);

    return NextResponse.json({ needsPayment });
  } catch (error) {
    return NextResponse.json({ needsPayment: false });
  }
}
