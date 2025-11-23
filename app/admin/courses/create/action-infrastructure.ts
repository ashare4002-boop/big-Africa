"use server";

import { requireAdmin } from "@/app/data/admin/require-admin";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import logger from "@/lib/logger";
import { ApiResponse } from "@/lib/type";
import { courseSchema, CourseSchemaType } from "@/lib/zodSchema";
import { request } from "@arcjet/next";

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 5,
  })
);

export async function CreateInfrastructureBaseCourse(
  values: CourseSchemaType & { courseType: "INFRASTRUCTURE_BASE" }
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        return {
          status: "error",
          message: "Access Denied...Rate Limit...",
          sound: "info",
        };
      } else {
        return {
          status: "error",
          message: "Access Denied...if an error please contact support.",
          sound: "error",
        };
      }
    }

    const validation = courseSchema.safeParse(values);

    if (!validation.success) {
      return {
        status: "error",
        message: "Invalid Form Data",
        sound: "info",
      };
    }

    // Infrastructure-based courses must have a price (not free)
    if (values.price === 0) {
      return {
        status: "error",
        message: "Infrastructure-based courses cannot be free. Please set a monthly price.",
        sound: "info",
      };
    }

    const course = await prisma.course.create({
      data: {
        ...validation.data,
        courseType: "INFRASTRUCTURE_BASE",
        userId: session?.user.id as string,
      },
    });

    return {
      status: "success",
      message: "Infrastructure-based course created successfully",
      data: { courseId: course.id } as any,
      sound: "success",
    };
  } catch (error) {
    logger.error({ err: error }, "Course creation error");
    return {
      status: "error",
      message: "Failed to create course",
      sound: "error",
    };
  }
}
