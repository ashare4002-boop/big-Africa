import { prisma } from "./db";
import logger from "./logger";

const TRIAL_DAYS = 7;
const MONTHLY_SUBSCRIPTION_PRICE = 1000; // XAF
const SUBSCRIPTION_WARNING_DAYS = 3;
const EXCLUDED_ROLES = ["admin", "staff"];

/**
 * Check if user is excluded from monthly subscription (admin/staff)
 */
export function isUserExcludedFromSubscription(role?: string | null): boolean {
  if (!role) return false;
  return EXCLUDED_ROLES.includes(role.toLowerCase());
}

/**
 * Get trial days remaining for user (0 if expired or not started)
 */
export function getTrialDaysRemaining(trialStartedAt?: Date | null): number {
  if (!trialStartedAt) return 0;
  
  const now = new Date();
  const trialEndDate = new Date(trialStartedAt);
  trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);
  
  const daysRemaining = Math.ceil(
    (trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return Math.max(0, daysRemaining);
}

/**
 * Check if user's trial is active
 */
export function isTrialActive(trialStartedAt?: Date | null): boolean {
  return getTrialDaysRemaining(trialStartedAt) > 0;
}

/**
 * Check if user has active monthly subscription
 */
export function hasActiveMonthlySubscription(
  monthlySubscriptionPaidUntil?: Date | null,
  role?: string | null
): boolean {
  // Admin and staff are excluded
  if (isUserExcludedFromSubscription(role)) return true;
  
  if (!monthlySubscriptionPaidUntil) return false;
  return monthlySubscriptionPaidUntil > new Date();
}

/**
 * Get subscription days remaining (0 if expired or not subscribed)
 */
export function getSubscriptionDaysRemaining(
  monthlySubscriptionPaidUntil?: Date | null
): number {
  if (!monthlySubscriptionPaidUntil) return 0;
  
  const now = new Date();
  const daysRemaining = Math.ceil(
    (monthlySubscriptionPaidUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return Math.max(0, daysRemaining);
}

/**
 * Check if user needs to pay (trial expired and no active subscription)
 * OPTIMIZED: Single query, no N+1
 */
export async function userNeedsToPayForSubscription(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, trialStartedAt: true, monthlySubscriptionPaidUntil: true },
  });

  if (!user) return false;
  
  // Excluded roles don't need to pay
  if (isUserExcludedFromSubscription(user.role)) return true;
  
  // If trial is active, don't need to pay
  if (isTrialActive(user.trialStartedAt)) return false;
  
  // If subscription is active, don't need to pay
  if (hasActiveMonthlySubscription(user.monthlySubscriptionPaidUntil, user.role)) {
    return false;
  }
  
  // Trial ended and no subscription = needs to pay
  return true;
}

/**
 * Start trial for new user (called after signup)
 */
export async function startTrialForUser(userId: string): Promise<void> {
  const data: any = {
    trialStartedAt: new Date(),
  };
  
  await prisma.user.update({
    where: { id: userId },
    data,
  });
  
  logger.info({ userId }, "Trial started for user");
}

/**
 * Process monthly subscription payment (called after NKWA webhook)
 */
export async function processMonthlySubscriptionPayment(userId: string): Promise<void> {
  const paidUntil = new Date();
  paidUntil.setMonth(paidUntil.getMonth() + 1);
  
  const data: any = {
    monthlySubscriptionPaidUntil: paidUntil,
  };
  
  await prisma.user.update({
    where: { id: userId },
    data,
  });
  
  logger.info({ userId, paidUntil }, "Monthly subscription payment processed");
}

/**
 * Send subscription expiration warnings (3 days before expiry)
 * OPTIMIZED: Only fetches users expiring in next 3 days (not all users!)
 */
export async function sendSubscriptionWarnings(): Promise<void> {
  const now = new Date();
  const warningDate = new Date();
  warningDate.setDate(warningDate.getDate() + SUBSCRIPTION_WARNING_DAYS);
  
  logger.info("Sending subscription expiration warnings...");
  
  // OPTIMIZATION: Only fetch users whose subscription expires in next 3 days
  const usersToWarn = await prisma.user.findMany({
    where: {
      // Must have a paid subscription ending in next 3 days
      monthlySubscriptionPaidUntil: {
        gte: now,
        lte: warningDate,
      },
      // Exclude admin/staff
      role: {
        notIn: EXCLUDED_ROLES,
      },
    },
    select: { id: true, email: true, name: true, monthlySubscriptionPaidUntil: true },
  });
  
  logger.info({ count: usersToWarn.length }, "Found users needing subscription warnings");
  
  if (usersToWarn.length === 0) return;
  
  // Create all notifications in parallel (OPTIMIZED: batch operation)
  const warnings = usersToWarn.map(async (user) => {
    try {
      const daysRemaining = getSubscriptionDaysRemaining(user.monthlySubscriptionPaidUntil);
      
      const notifData: any = {
        type: "SUBSCRIPTION_WARNING",
        title: "Platform Subscription Expiring Soon",
        message: `Your monthly platform subscription (1000 XAF) expires in ${Math.max(1, daysRemaining)} day(s). Pay now to keep full access.`,
        daysRemaining: Math.max(1, daysRemaining),
        amountDue: MONTHLY_SUBSCRIPTION_PRICE,
        userId: user.id,
      };
      
      await prisma.notification.create({
        data: notifData,
      });
      
      logger.info({ userId: user.id, daysRemaining }, "Subscription warning created");
    } catch (error) {
      // Log but don't crash - one user's warning failure shouldn't break the entire batch
      logger.error(
        { err: error, userId: user.id },
        "Failed to create subscription warning"
      );
    }
  });
  
  await Promise.allSettled(warnings);
  logger.info({ count: usersToWarn.length }, "Subscription warning batch completed");
}

/**
 * Process subscription check cron job
 */
export async function processSubscriptionCheck(): Promise<void> {
  logger.info("Starting subscription check...");
  await sendSubscriptionWarnings();
  logger.info("Subscription check completed");
}
