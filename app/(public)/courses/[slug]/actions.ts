"user server";

import { requireUser } from "@/app/data/user/verify-user-session";
import arcjet, { fixedWindow } from "@/lib/arcjet";
import { prisma } from "@/lib/db";
import { nkwa } from "@/lib/nkwa";
import { ApiResponse } from "@/lib/type";


const aj = arcjet.withRule( // Need to use it for protection
    fixedWindow({
        mode: "LIVE",
        window: "1m",
        max: 5
    })
)

export async function enrollInCourseAction(
  courseId: string
): Promise<ApiResponse> {
  const user = await requireUser();
  try {
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
      },
      select: {
        id: true,
        title: true,
        price: true,
        slug: true,
      },
    });

    if (!course) {
      return {
        status: "error",
        message: "Course not found",
        sound: "error",
      };
    }
    let nkwaCustomerId: string;
    const userWithNkwaCustomerId = await prisma.user.findUnique({
      /**Need to verify if nkwa has user customer id */
      where: {
        id: user.id,
      },

      select: {
        nkwaCustomerId: true,
      },
    });

    if (userWithNkwaCustomerId?.nkwaCustomerId) {
      nkwaCustomerId = userWithNkwaCustomerId.nkwaCustomerId;
    } else {
      // ...needs first to check if it takes customers
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingEnrollment = await tx.enrollment.findUnique({
        where: {
          userId_courseId: {
            userId: user.id,
            courseId: courseId,
          },
        },
        select: {
          status: true,
          id: true,
        },
      });

      if (existingEnrollment?.status === "Active") {
        return {
          status: "success",
          message: "You are already enroll in this course",
          sound: "success",
        };
      }

      let enrollment;

      if (existingEnrollment) {
        enrollment = await tx.enrollment.update({
          where: {
            id: existingEnrollment.id,
          },

          data: {
            amount: course.price,
            status: "Pending",
            updatedAt: new Date(),
          },
        });
      } else {
        enrollment = await tx.enrollment.create({
          data: {
            userId: user.id,
            courseId: course.id,
            amount: course.price,
            status: "Pending",
          },
        });
      }


      //Does nkwa takes check out session? Please need to add nkwa integration
    });

    return {
      status: "success",
      message: "Nkwa",
      sound: "success",
    };
  } catch {
    return {
      status: "error",
      message: "Failed to enroll in course",
      sound: "error",
    };
  }
}
