// app/api/enrollment/status/route.ts (CORRECTED)

import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireUser } from "@/app/data/user/verify-user-session";
import logger from "@/lib/logger";

// This is a GET request, typically secured by session or authentication 
export async function GET(request: Request) {
    // Authentication Check
    const user = await requireUser();
    
    try {
        const { searchParams } = new URL(request.url);
        const paymentId = searchParams.get("paymentId");

        if (!paymentId) {
            return NextResponse.json(
                { error: "Payment ID is required" },
                { status: 400 }
            );
        }

        // CRITICAL FIX: Include the related Course data (title and slug)
        const enrollment = await prisma.enrollment.findUnique({
            where: { transactionId: paymentId },
            select: {
                status: true,
                userId: true,
                Course: { // Include the Course relation
                    select: {
                        title: true, // Needed for success message
                        slug: true,  // CRITICAL: Needed for redirection URL
                    },
                },
            }
        });

        // Authorization Check
        if (!enrollment || enrollment.userId!== user.id) {
            // Return 404 (or 403 Forbidden) and keep status ambiguous for security
            return NextResponse.json(
                { status: "Not_Found" },
                { status: 404 }
            );
        }
        
        // Return the full status and course details required by the ClientStatusPoller
        return NextResponse.json({
            status: enrollment.status,
            courseTitle: enrollment.Course.title, // Return course title
            courseSlug: enrollment.Course.slug,   // Return course slug
        });

    } catch (error) {
         logger.error({ err: error }, "Polling endpoint error");
        return NextResponse.json(
            { status: "Error", message: "Internal server error" },
            { status: 500 }
        );
    }
}