import { prisma } from "./db";
import logger from "./logger";

/**
 * Check if an infrastructure is locked (either manually or by deadline/capacity)
 */
export async function isInfrastructureLocked(infrastructureId: string): Promise<boolean> {
  const infrastructure = await prisma.infrastructure.findUnique({
    where: { id: infrastructureId },
  });

  if (!infrastructure) return true;

  // Manually locked
  if (infrastructure.isLocked === true) return true;

  // At capacity
  if (infrastructure.currentEnrollment >= infrastructure.capacity) return true;

  // Past enrollment deadline
  if (infrastructure.enrollmentDeadline && new Date() > infrastructure.enrollmentDeadline) {
    return true;
  }

  return false;
}

/**
 * Check if entire course (all infrastructures) is locked
 */
export async function isCourseLocked(courseId: string): Promise<boolean> {
  const infrastructures = await prisma.infrastructure.findMany({
    where: {
      town: {
        courseId,
      },
    },
  });

  if (infrastructures.length === 0) return false;

  // All infrastructures must be locked
  for (const infra of infrastructures) {
    const locked = await isInfrastructureLocked(infra.id);
    if (!locked) return false;
  }

  return true;
}

/**
 * Get available infrastructures for a user to enroll in
 */
export async function getAvailableInfrastructures(courseId: string) {
  const infrastructures = await prisma.infrastructure.findMany({
    where: {
      town: {
        courseId,
      },
    },
    include: {
      town: true,
    },
  });

  const available = [];
  for (const infra of infrastructures) {
    const locked = await isInfrastructureLocked(infra.id);
    if (!locked) {
      available.push({
        ...infra,
        spotsRemaining: infra.capacity - infra.currentEnrollment,
      });
    }
  }

  return available;
}

/**
 * Calculate when next payment is due (1 month from last paid date)
 */
export function calculateNextPaymentDue(lastPaidDate: Date): Date {
  const next = new Date(lastPaidDate);
  next.setMonth(next.getMonth() + 1);
  return next;
}

/**
 * Check if user payment is overdue
 */
export function isPaymentOverdue(nextPaymentDue: Date | null): boolean {
  if (!nextPaymentDue) return false;
  return new Date() > nextPaymentDue;
}

/**
 * Calculate days overdue
 */
export function getDaysOverdue(nextPaymentDue: Date | null): number {
  if (!nextPaymentDue) return 0;
  const now = new Date();
  if (now <= nextPaymentDue) return 0;
  
  const daysMs = now.getTime() - nextPaymentDue.getTime();
  return Math.floor(daysMs / (1000 * 60 * 60 * 24));
}

/**
 * Eject user from infrastructure course for non-payment
 */
export async function ejectUserForNonPayment(enrollmentId: string): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) throw new Error("Enrollment not found");

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: {
      isEjected: true,
      ejectionCount: enrollment.ejectionCount + 1,
      status: "Cancelled",
    },
    include: {
      User: true,
      infrastructure: true,
    },
  });

  // Decrease infrastructure enrollment
  if (enrollment.infrastructureId) {
    await prisma.infrastructure.update({
      where: { id: enrollment.infrastructureId },
      data: {
        currentEnrollment: {
          decrement: 1,
        },
      },
    });
  }

  // Send ejection notice
  try {
    const notif = await import("./notifications");
    const reEnrollmentDeadline = new Date();
    reEnrollmentDeadline.setDate(reEnrollmentDeadline.getDate() + 30);
    
    await (notif as any).sendEjectionNotice((updatedEnrollment.User as any).email, {
      studentName: (updatedEnrollment.User as any).name || "Student",
      courseName: "Course",
      infrastructureName: (updatedEnrollment.infrastructure as any)?.name || "N/A",
      daysOverdue: getDaysOverdue(enrollment.nextPaymentDue),
      reEnrollmentDeadline,
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to send ejection notice");
  }
}

/**
 * Allow user to re-enroll if they were ejected and course is full
 */
export async function canUserReEnroll(enrollmentId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) return false;
  if (!enrollment.isEjected) return false;

  // Check if ejection period exceeded (e.g., more than 30 days)
  const ejectionDate = enrollment.updatedAt;
  const daysEjected = Math.floor(
    (new Date().getTime() - ejectionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Can re-enroll if less than 30 days ejected
  return daysEjected < 30;
}

/**
 * Process monthly subscription check (call via cron job)
 */
export async function processMonthlySubscriptionCheck(): Promise<void> {
  const now = new Date();

  // Find all infrastructure-based enrollments that are overdue
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
    include: {
      infrastructure: true,
      Course: true,
      User: true,
    },
  });

  for (const enrollment of overdueEnrollments) {
    await ejectUserForNonPayment(enrollment.id);

    // TODO: Send notification to infrastructure owner
    // sendNotificationToOwner(enrollment.infrastructure.ownerPhoneNumber, ...)
  }
}
