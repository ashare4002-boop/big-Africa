import { prisma } from "./db";
import { env } from "./env";
import logger from "./logger";
import * as notif from "./notifications"; 

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
  const lockStatuses = await Promise.all(
    infrastructures.map(infra => isInfrastructureLocked(infra.id))
  );

  return lockStatuses.every(status => status === true);
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

  // OPTIMIZATION: Check locks in parallel
  const checks = await Promise.all(
    infrastructures.map(async (infra) => {
      const locked = await isInfrastructureLocked(infra.id);
      return locked ? null : infra;
    })
  );

  return checks
    .filter((infra) => infra !== null)
    .map((infra: any) => ({
      ...infra,
      spotsRemaining: infra.capacity - infra.currentEnrollment,
    }));
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
export async function ejectUserForNonPayment(enrollmentId: string, enrollmentData?: any): Promise<void> {

  let enrollment = enrollmentData;
  if (!enrollment) {
    enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { User: true, infrastructure: true } 
    });
  }

  if (!enrollment) {
    logger.warn({ enrollmentId }, "Attempted to eject non-existent enrollment");
    return;
  }


  try {
    const [updatedEnrollment] = await prisma.$transaction([
      // Mise à jour de l'enrollment
      prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          isEjected: true,
          ejectionCount: (enrollment.ejectionCount || 0) + 1,
          status: "Cancelled",
        },
        include: {
          User: true,
          infrastructure: true,
        },
      }),
      // Decrement infrastructure enrollment (si applicable)
      ...(enrollment.infrastructureId ? [
        prisma.infrastructure.update({
          where: { id: enrollment.infrastructureId },
          data: {
            currentEnrollment: { decrement: 1 },
          },
        })
      ] : [])
    ]);


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
    logger.error({ err: error, enrollmentId }, "Failed to eject user or send notice");
    throw error; 
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

  const ejectionDate = enrollment.updatedAt;
  const daysEjected = Math.floor(
    (new Date().getTime() - ejectionDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return daysEjected < 30;
}

/**
 * Send payment due warnings to enrollments 3 days before payment due
 */
export async function sendPaymentWarnings(): Promise<void> {
  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  logger.info("Sending payment due warnings for enrollments...");

  // Find enrollments that:
  // - Are not ejected
  // - Have nextPaymentDue within next 3 days (but not yet overdue)
  // - Haven't received warning yet
  // - Have infrastructure (infrastructure-based courses only)
  const enrollmentsToWarn = await prisma.enrollment.findMany({
    where: {
      isEjected: false,
      warningEmailSent: false,
      nextPaymentDue: {
        gte: now,
        lte: threeDaysFromNow,
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

  logger.info({ count: enrollmentsToWarn.length }, "Found enrollments needing payment warnings");

  if (enrollmentsToWarn.length === 0) return;

  // Send warnings in parallel (OPTIMIZED: no N+1 queries)
  const warnings = enrollmentsToWarn.map(async (enrollment) => {
    try {
      const daysRemaining = Math.ceil(
        (enrollment.nextPaymentDue!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const paymentLink = `${env.NEXT_PUBLIC_BASE_URL}/enrollment/${enrollment.id}/pay`;

      // Use data we already fetched (no redundant database queries!)
      const courseName = enrollment.Course?.title || "Course";
      const infraName = enrollment.infrastructure?.name || "Learning Center";
      const userEmail = enrollment.User?.email;
      const userName = enrollment.User?.name || "Student";

      if (!userEmail) {
        logger.warn({ enrollmentId: enrollment.id }, "Enrollment missing user email, skipping");
        return;
      }

      // Send email and create in-app notification in parallel
      await Promise.all([
        // Send email
        (notif as any).sendPaymentDueWarning(userEmail, {
          studentName: userName,
          courseName,
          infrastructureName: infraName,
          daysRemaining: Math.max(1, daysRemaining),
          amountDue: enrollment.amount,
          paymentLink,
        }),
        // Create in-app notification and mark warning sent in transaction
        prisma.$transaction([
          prisma.notification.create({
            data: {
              type: "PAYMENT_WARNING",
              title: `Payment Due Soon - ${courseName}`,
              message: `Your subscription payment of XAF ${enrollment.amount.toLocaleString()} is due in ${Math.max(1, daysRemaining)} day(s). Click to pay now.`,
              daysRemaining: Math.max(1, daysRemaining),
              amountDue: enrollment.amount,
              enrollmentId: enrollment.id,
              userId: enrollment.userId,
            },
          }),
          prisma.enrollment.update({
            where: { id: enrollment.id },
            data: { warningEmailSent: true },
          }),
        ]),
      ]);

      logger.info({ enrollmentId: enrollment.id }, "Payment warning sent successfully");
    } catch (error) {
      logger.error(
        { err: error, enrollmentId: enrollment.id },
        "Failed to send payment warning"
      );
    }
  });

  await Promise.allSettled(warnings);
  logger.info("Payment warning batch completed");
}

/**
 * Process monthly subscription check (call via cron job)
 * HIGHLY OPTIMIZED VERSION
 */
export async function processMonthlySubscriptionCheck(): Promise<void> {
  const now = new Date();
  logger.info("Starting monthly subscription check...");

  // 1. Send payment warnings first (3 days before due)
  await sendPaymentWarnings();

  // 2. Fetch all overdue enrollments at once
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

  logger.info({ count: overdueEnrollments.length }, "Found overdue enrollments to process");

  if (overdueEnrollments.length === 0) return;

  // 3. Eject users in parallel
  const results = await Promise.allSettled(
    overdueEnrollments.map((enrollment) => 
      ejectUserForNonPayment(enrollment.id, enrollment)
    )
  );

  // 4. Log results
  const rejected = results.filter(r => r.status === 'rejected');
  if (rejected.length > 0) {
    logger.error({ errorCount: rejected.length }, "Some ejections failed during cron job");
  } else {
    logger.info("All overdue enrollments processed successfully");
  }
}