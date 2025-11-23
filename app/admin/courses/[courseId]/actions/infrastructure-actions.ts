"use server";

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
      return {
        status: "error",
        message: "Invalid form data",
        sound: "info",
      };
    }

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

    return {
      status: "success",
      message: "Infrastructure created successfully",
      sound: "success",
    };
  } catch (error) {
    logger.error({ err: error }, "Infrastructure creation failed");
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
