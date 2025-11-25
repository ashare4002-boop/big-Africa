import { Resend } from "resend";
import { env } from "./env";
import logger from "./logger";

const resend = new Resend(env.RESEND_API_KEY);

const SUPPORT_FOOTER = `
  <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
  <p style="color: #666; font-size: 12px; margin-top: 10px;">
    <strong>Need Help?</strong><br/>
    Email: <a href="mailto:${env.SUPPORT_EMAIL}" style="color: #007bff;">${env.SUPPORT_EMAIL}</a><br/>
    Please include your enrollment or transaction ID in your message.
  </p>
`;

/**
 * Send enrollment confirmation email to infrastructure owner
 */
export async function sendInfrastructureOwnerNotification(
  ownerEmail: string,
  data: {
    studentName: string;
    studentEmail: string;
    courseName: string;
    infrastructureName: string;
    town: string;
    monthlyFee: number;
  }
) {
  try {
    await resend.emails.send({
      from: "noreply@resend.dev",
      to: ownerEmail,
      subject: `New Enrollment: ${data.studentName} enrolled in ${data.courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Student Enrollment</h2>
          <p>A new student has enrolled in your infrastructure-based course:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Student Name:</strong> ${data.studentName}</p>
            <p><strong>Student Email:</strong> ${data.studentEmail}</p>
            <p><strong>Course:</strong> ${data.courseName}</p>
            <p><strong>Infrastructure:</strong> ${data.infrastructureName}</p>
            <p><strong>Town:</strong> ${data.town}</p>
            <p><strong>Monthly Fee:</strong> XAF ${data.monthlyFee.toLocaleString()}</p>
          </div>
          
          ${SUPPORT_FOOTER}
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Failed to send infrastructure owner notification");
    return { success: false, error };
  }
}




/**
 * Send payment receipt email to student
 */
export async function sendPaymentReceipt(
  studentEmail: string,
  data: {
    studentName: string;
    courseName: string;
    infrastructureName: string;
    amount: number;
    transactionId: string;
    paymentDate: Date;
    nextPaymentDue: Date;
  }
) {
  try {
    await resend.emails.send({
      from: "noreply@resend.dev",
      to: studentEmail,
      subject: `Payment Receipt: ${data.courseName} - XAF ${data.amount.toLocaleString()}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Payment Receipt</h2>
          <p>Hello ${data.studentName},</p>
          <p>Your payment has been successfully received. Here are your payment details:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Course:</strong> ${data.courseName}</p>
            <p><strong>Learning Center:</strong> ${data.infrastructureName}</p>
            <p><strong>Amount Paid:</strong> XAF ${data.amount.toLocaleString()}</p>
            <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
            <p><strong>Payment Date:</strong> ${data.paymentDate.toLocaleDateString()}</p>
            <p><strong>Next Payment Due:</strong> ${data.nextPaymentDue.toLocaleDateString()}</p>
          </div>
          <p>Your enrollment is now confirmed! You can access course materials and connect with your instructors.</p>
          <p><strong>Important:</strong> Your payment is non-refundable once confirmed. Your learning center location is locked after enrollment.</p>
          ${SUPPORT_FOOTER}
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Failed to send payment receipt");
    return { success: false, error };
  }
}

/**
 * Send ejection notice to student for non-payment
 */
export async function sendEjectionNotice(
  studentEmail: string,
  data: {
    studentName: string;
    courseName: string;
    infrastructureName: string;
    daysOverdue: number;
    reEnrollmentDeadline: Date;
  }
) {
  try {
    await resend.emails.send({
      from: "noreply@resend.dev",
      to: studentEmail,
      subject: `Important: Course Enrollment Suspended - ${data.courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d9534f;">Enrollment Suspended</h2>
          <p>Hello ${data.studentName},</p>
          <p style="color: #d9534f; font-weight: bold;">Your enrollment in ${data.courseName} has been suspended due to non-payment.</p>
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p><strong>Course:</strong> ${data.courseName}</p>
            <p><strong>Learning Center:</strong> ${data.infrastructureName}</p>
            <p><strong>Days Overdue:</strong> ${data.daysOverdue} days</p>
            <p><strong>Re-enrollment Deadline:</strong> ${data.reEnrollmentDeadline.toLocaleDateString()}</p>
          </div>
          <p>You have until <strong>${data.reEnrollmentDeadline.toLocaleDateString()}</strong> to complete your payment and reclaim your enrollment.</p>
          <p>After this date, your spot may be reassigned to another student.</p>
          <p><a href="${env.NEXT_PUBLIC_BASE_URL}/my-enrollments" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 15px 0;">Make Payment Now</a></p>
          ${SUPPORT_FOOTER}
        </div>
      `,
    });
    return { success: true };
  } catch (error) {
    logger.error({ err: error }, "Failed to send ejection notice");
    return { success: false, error };
  }
}
