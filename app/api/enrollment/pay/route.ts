import { NextRequest, NextResponse } from "next/server";
import { nkwa } from "@/lib/nkwa";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * POST /api/enrollment/pay
 * Initialize payment for infrastructure-based course enrollment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { enrollmentId } = await request.json();

    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Enrollment ID is required" },
        { status: 400 }
      );
    }

    // Get enrollment details
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        Course: true,
        infrastructure: true,
        User: true,
      },
    }) as any;

    if (!enrollment) {
      return NextResponse.json(
        { error: "Enrollment not found" },
        { status: 404 }
      );
    }

    if (enrollment.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    // Initialize NKWA payment
    const paymentReference = `INFRA-${enrollment.id.slice(0, 8)}-${Date.now()}`;
    
    const paymentResponse = await (nkwa as any).initializePayment({
      reference: paymentReference,
      amount: enrollment.amount,
      email: enrollment.User.email,
      phone: enrollment.User.name, // NKWA expects phone but we'll use name for now
      description: `Payment for ${enrollment.Course.title} - ${enrollment.infrastructure?.name}`,
      currency: "XAF", // Cameroon currency
      metadata: {
        enrollmentId: enrollment.id,
        courseId: enrollment.courseId,
        infrastructureId: enrollment.infrastructureId,
        userId: enrollment.userId,
      },
    });

    // Update enrollment with transaction ID
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        transactionId: paymentReference,
      },
    });

    return NextResponse.json({
      success: true,
      paymentLink: (paymentResponse.data as any)?.payment_link || (paymentResponse.data as any)?.checkout_url,
      reference: paymentReference,
    });
  } catch (error) {
    console.error("Payment initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
