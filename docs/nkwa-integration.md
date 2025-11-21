# Nkwa Payment Integration Guide

## Overview

The A-Share platform integrates with Nkwa Pay to process mobile money payments for course enrollments in Cameroon. This integration supports both MTN and Orange mobile money services.

## How It Works

### Payment Flow

1. **User Initiates Enrollment**
   - User clicks "Enroll Now" on a course page
   - A dialog opens asking for their mobile money phone number
   - Phone number must be in format: `237XXXXXXXXX` (Cameroon country code + 9 digits)
   - MTN numbers start with `237 67X` or `237 65X`
   - Orange numbers start with `237 69X` or `237 65X`

2. **Payment Request Created**
   - System validates the phone number format
   - Creates or updates an enrollment record with status "Pending"
   - Initiates a collection request with Nkwa Pay API
   - Stores the payment transaction ID in the enrollment record

3. **Customer Authorization**
   - User receives a USSD prompt on their phone
   - They enter their mobile money PIN to authorize the payment
   - This typically takes a few seconds to a few minutes

4. **Payment Processing**
   - Nkwa Pay processes the payment with the mobile network operator
   - Payment can result in: `success`, `failed`, `canceled`, or remain `pending`

5. **Webhook Notification**
   - Nkwa sends a webhook to `/api/webhook/nkwa`
   - System updates enrollment status based on payment result:
     - `success` → Enrollment status becomes "Active"
     - `failed` or `canceled` → Enrollment status becomes "Cancelled"

## Files Modified/Created

### Core Integration Files

1. **`lib/nkwa.ts`**
   - Initializes the Nkwa Pay SDK with API key
   - Provides a singleton instance for making API calls

2. **`app/(public)/courses/[slug]/actions.ts`**
   - `enrollInCourseAction(courseId, phoneNumber)` - Main enrollment action
   - Validates phone number format
   - Checks for existing active enrollments
   - Creates Nkwa payment collection request
   - Stores transaction details in database

3. **`app/api/webhook/nkwa/route.ts`**
   - Receives payment status updates from Nkwa
   - Verifies webhook signature (if NKWA_PUBLIC_KEY is configured)
   - Updates enrollment status based on payment outcome
   - Logs all webhook events for debugging

4. **`app/(public)/courses/[slug]/check-payment-status.ts`**
   - Server action to manually check payment status
   - Polls Nkwa API for current payment state
   - Updates enrollment accordingly
   - Used by success page to verify payment completion

### UI Components

1. **`app/(public)/courses/[slug]/_components/EnrollmentButton.tsx`**
   - Dialog-based enrollment form
   - Collects phone number from user
   - Validates phone format client-side
   - Provides clear feedback about payment process

2. **`app/payments/success/page.tsx`**
   - Shows payment verification status
   - Checks final payment state via API
   - Redirects to course if enrollment is active
   - Handles pending/processing states

3. **`app/payments/cancel/page.tsx`**
   - Displays cancellation message
   - Provides option to return to course or homepage

## Environment Variables

### Required

- `NKWA_API_KEY` - Your Nkwa Pay API key (sandbox or production)

### Optional

- `NKWA_PUBLIC_KEY` - Nkwa's RSA public key for webhook signature verification
  - Format: Base64-encoded public key without headers
  - Obtain from Nkwa Pay dashboard settings

## Database Schema

### Enrollment Model Fields Used

```prisma
model Enrollment {
  transactionId String? @unique    // Nkwa payment ID
  provider      String?            // Always "nkwa" for this integration
  rawResponse   Json?              // Full payment object from Nkwa
  paidAt        DateTime?          // Timestamp when payment succeeded
  status        EnrollmentStatus   // Pending → Active/Cancelled
}
```

### Enrollment Statuses

- **Pending** - Payment initiated, awaiting confirmation
- **Active** - Payment successful, user enrolled
- **Cancelled** - Payment failed or cancelled
- **Paid** - (Reserved for future use)

## Testing

### Sandbox Environment

The integration uses Nkwa's sandbox by default. To test:

#### MTN Test Numbers

Use test numbers from: <https://momodeveloper.mtn.com/api-documentation/testing>

Example: `237650000001`

#### Orange Test Numbers

Use real Orange number: `237655684466`

- When prompted, enter PIN: `4444`

### Production Environment

To switch to production:

1. Obtain production API key from Nkwa dashboard
2. Update `NKWA_API_KEY` secret in Replit
3. Optionally configure `serverURL` in `lib/nkwa.ts`:

```typescript
export const nkwa = new Pay({
  apiKeyAuth: env.NKWA_API_KEY,
  serverURL: "https://api.pay.mynkwa.com", // Production
});
```

## Webhook Configuration

### Setting Up Webhooks

1. Log in to Nkwa Pay dashboard
2. Navigate to Webhooks/Settings
3. Add callback URL: `https://your-replit-domain.replit.app/api/webhook/nkwa`
4. Save your public key from dashboard to `NKWA_PUBLIC_KEY` secret

### Webhook Security

The webhook endpoint:

- Verifies signature using RSA-SHA256 if `NKWA_PUBLIC_KEY` is set
- Checks `X-Signature` and `X-Timestamp` headers
- Validates message format: `timestamp + callbackUrl + body`
- Returns 401 for invalid signatures
- Returns 200 for successful processing (required by Nkwa)

### Webhook Retries

- Nkwa retries for 15 minutes if webhook fails
- Retries occur every minute
- Your endpoint must return HTTP 200 to stop retries

## Error Handling

### Common Errors

1. **Invalid Phone Number**
   - Client-side validation prevents submission
   - Server validates format: `^237[6-7]\d{8}$`
   - User sees clear error message

2. **Already Enrolled**
   - System checks for existing active enrollment
   - Prevents duplicate payments
   - Reuses existing pending enrollment if found

3. **Payment Timeout**
   - User has ~5 minutes to authorize payment
   - Payment remains pending until user acts or timeout occurs
   - Webhook updates status when MNO responds

4. **Network Issues**
   - Nkwa handles MNO downtime automatically
   - Suspends failing operators automatically
   - Reconciles pending payments manually

## Payment Status Flow

.
User Clicks "Enroll Now"
  ↓
Dialog Opens (Phone Number Input)
  ↓
User Submits Form
  ↓
Create Enrollment (Status: Pending)
  ↓
Nkwa.collect() - Send Payment Request
  ↓
Store Transaction ID
  ↓
User Receives USSD Prompt
  ↓
User Enters PIN
  ↓
MNO Processes Payment
  ↓
Nkwa Sends Webhook
  ↓
Update Enrollment Status:
  • success → Active (user enrolled)
  • failed/canceled → Cancelled
  • pending → No change

## Monitoring & Debugging

### Check Payment Status

Manually verify payment via server action:

```typescript
import { checkPaymentStatus } from "@/app/(public)/courses/[slug]/check-payment-status";

const result = await checkPaymentStatus(paymentId);
```

### View Logs

Webhook events are logged to console:

- Payment ID and status
- Enrollment updates
- Error details

### Database Queries

Check enrollment status:

```sql
SELECT 
  e.status,
  e.transactionId,
  e.paidAt,
  e.rawResponse,
  c.title AS course,
  u.email AS user
FROM Enrollment e
JOIN Course c ON e.courseId = c.id
JOIN User u ON e.userId = u.id
WHERE e.transactionId = 'payment_id_here';
```

## Best Practices

1. **Always use webhooks** - Don't rely on polling for payment status
2. **Validate phone numbers** - Prevent invalid requests to Nkwa
3. **Store raw responses** - Helps with debugging and reconciliation
4. **Log everything** - Webhook events, errors, status changes
5. **Handle all states** - success, failed, canceled, pending
6. **Test thoroughly** - Use sandbox before production
7. **Monitor MNO status** - Check availability endpoint if needed

## Troubleshooting

### Payment Stuck in Pending

- User may not have completed PIN entry
- Network issue at MNO side
- Use `checkPaymentStatus()` to poll Nkwa
- Nkwa reconciles automatically within 15 minutes

### Webhook Not Received

- Verify callback URL in Nkwa dashboard
- Check Replit app is running
- Ensure endpoint returns HTTP 200
- Check webhook logs in Nkwa dashboard

### Signature Verification Fails

- Verify `NKWA_PUBLIC_KEY` format (base64, no headers)
- Check public key matches Nkwa dashboard
- Ensure message reconstruction is correct

## API Reference

### Nkwa Pay SDK Methods

```typescript
// Collect payment from customer
const payment = await nkwa.payments.collect({
  amount: 1000,           // Amount in XAF
  phoneNumber: "237600000000"
});

// Check payment status
const status = await nkwa.payments.get({
  id: paymentId
});

// Check MNO availability
const availability = await nkwa.availability.get();
```

## Support

For Nkwa Pay API issues:

- Documentation: <https://docs.mynkwa.com>
- Dashboard: <https://pay.mynkwa.com> (production)
- Dashboard: <https://pay.staging.mynkwa.com> (sandbox)
