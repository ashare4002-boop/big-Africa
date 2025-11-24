"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/app/data/admin/require-admin";
import { prisma } from "@/lib/db";
import { ApiResponse } from "@/lib/type";
import { infrastructureSchema, InfrastructureSchemaType } from "@/lib/zodSchema";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { request } from "@arcjet/next";
import logger from "@/lib/logger";

const aj = arcjet.withRule(
  fixedWindow({
    mode: "LIVE",
    window: "1m",
    max: 10,
  })
);

export async function createInfrastructure(
  data: InfrastructureSchemaType & { courseId: string; tutorNames: string[] }
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Rate limit exceeded",
        sound: "info",
      };
    }

    const validation = infrastructureSchema.safeParse(data);
    if (!validation.success) {
      const errors = validation.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      logger.error({ errors, receivedData: data }, "Infrastructure validation failed");
      console.error("[Infrastructure Creation] Validation Error Details:", errors);
      return {
        status: "error",
        message: `Invalid form data: ${errors}`,
        sound: "info",
      };
    }

    const courseId = data.courseId;

    try {
      await prisma.infrastructure.create({
      data: {
        name: validation.data.name,
        capacity: validation.data.capacity,
        location: validation.data.location,
        publicContact: validation.data.publicContact,
        privateContact: validation.data.privateContact,
        ownerPhoneNumber: validation.data.ownerPhoneNumber,
        facilityImageKey: validation.data.facilityImageKey,
        locationImageKey: validation.data.locationImageKey,
        enrollmentDeadline: validation.data.enrollmentDeadline,
        duration: validation.data.duration,
        durationType: validation.data.durationType,
        tutorNames: data.tutorNames,
        townId: validation.data.townId,
      },
    });

      // Revalidate the infrastructure page to refresh list
      revalidatePath(`/admin/courses/${courseId}/infrastructure`);

      return {
        status: "success",
        message: "Infrastructure created successfully",
        sound: "success",
      };
    } catch (dbError) {
      logger.error({ err: dbError }, "Database error creating infrastructure");
      console.error("[Infrastructure Creation] Database Error:", dbError);
      return {
        status: "error",
        message: `Failed to create infrastructure: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
        sound: "error",
      };
    }
  } catch (error) {
    logger.error({ err: error }, "Infrastructure creation failed");
    console.error("[Infrastructure Creation] Unexpected Error:", error);
    return {
      status: "error",
      message: "Failed to create infrastructure",
      sound: "error",
    };
  }
}

export async function createTown(
  courseId: string,
  townName: string
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Rate limit exceeded",
        sound: "info",
      };
    }

    if (!townName || townName.trim().length < 2) {
      return {
        status: "error",
        message: "Town name must be at least 2 characters",
        sound: "info",
      };
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return {
        status: "error",
        message: "Course not found",
        sound: "error",
      };
    }

    await prisma.town.create({
      data: {
        name: townName,
        courseId,
      },
    });

    // Revalidate the infrastructure page to refresh towns list
    revalidatePath(`/admin/courses/${courseId}/infrastructure`);

    return {
      status: "success",
      message: "Town created successfully",
      sound: "success",
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to create town",
      sound: "error",
    };
  }
}

export async function updateInfrastructureStatus(
  infrastructureId: string,
  isLocked: boolean
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    await prisma.infrastructure.update({
      where: { id: infrastructureId },
      data: { isLocked },
    });

    return {
      status: "success",
      message: `Infrastructure ${isLocked ? "locked" : "unlocked"} successfully`,
      sound: "success",
    };
  } catch (error) {
    return {
      status: "error",
      message: "Failed to update infrastructure status",
      sound: "error",
    };
  }
}

export async function updateInfrastructure(
  infrastructureId: string,
  data: InfrastructureSchemaType & { tutorNames: string[] }
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Rate limit exceeded",
        sound: "info",
      };
    }

    const validation = infrastructureSchema.safeParse(data);
    if (!validation.success) {
      const errors = validation.error.issues
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      logger.error({ errors, receivedData: data }, "Infrastructure update validation failed");
      console.error("[Infrastructure Update] Validation Error Details:", errors);
      return {
        status: "error",
        message: `Invalid form data: ${errors}`,
        sound: "info",
      };
    }

    const infrastructure = await prisma.infrastructure.findUnique({
      where: { id: infrastructureId },
      include: { town: { include: { course: true } } },
    });

    try {
      await prisma.infrastructure.update({
      where: { id: infrastructureId },
      data: {
        name: validation.data.name,
        capacity: validation.data.capacity,
        location: validation.data.location,
        publicContact: validation.data.publicContact,
        privateContact: validation.data.privateContact,
        ownerPhoneNumber: validation.data.ownerPhoneNumber,
        facilityImageKey: validation.data.facilityImageKey,
        locationImageKey: validation.data.locationImageKey,
        enrollmentDeadline: validation.data.enrollmentDeadline,
        duration: validation.data.duration,
        durationType: validation.data.durationType,
        tutorNames: data.tutorNames,
        townId: validation.data.townId,
      },
    });

      // Revalidate the infrastructure page
      if (infrastructure?.town?.course?.id) {
        revalidatePath(`/admin/courses/${infrastructure.town.course.id}/infrastructure`);
      }

      return {
        status: "success",
        message: "Infrastructure updated successfully",
        sound: "success",
      };
    } catch (dbError) {
      logger.error({ err: dbError }, "Database error updating infrastructure");
      console.error("[Infrastructure Update] Database Error:", dbError);
      return {
        status: "error",
        message: `Failed to update infrastructure: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`,
        sound: "error",
      };
    }
  } catch (error) {
    logger.error({ err: error }, "Infrastructure update failed");
    console.error("[Infrastructure Update] Unexpected Error:", error);
    return {
      status: "error",
      message: "Failed to update infrastructure",
      sound: "error",
    };
  }
}

export async function deleteInfrastructure(
  infrastructureId: string
): Promise<ApiResponse> {
  const session = await requireAdmin();

  try {
    const req = await request();
    const decision = await aj.protect(req, {
      fingerprint: session.user.id,
    });

    if (decision.isDenied()) {
      return {
        status: "error",
        message: "Rate limit exceeded",
        sound: "info",
      };
    }

    // Check if infrastructure has active enrollments
    const enrollments = await prisma.enrollment.findFirst({
      where: {
        infrastructureId,
        status: "Active",
      },
    });

    if (enrollments) {
      return {
        status: "error",
        message: "Cannot delete infrastructure with active enrollments",
        sound: "info",
      };
    }

    const infrastructure = await prisma.infrastructure.findUnique({
      where: { id: infrastructureId },
      include: { town: { include: { course: true } } },
    });

    await prisma.infrastructure.delete({
      where: { id: infrastructureId },
    });

    // Revalidate the infrastructure page
    if (infrastructure?.town?.course?.id) {
      revalidatePath(`/admin/courses/${infrastructure.town.course.id}/infrastructure`);
    }

    return {
      status: "success",
      message: "Infrastructure deleted successfully",
      sound: "success",
    };
  } catch (error) {
    logger.error({ err: error }, "Infrastructure deletion failed");
    return {
      status: "error",
      message: "Failed to delete infrastructure",
      sound: "error",
    };
  }
}
