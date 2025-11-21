import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { checkPaymentStatus } from "@/app/(public)/courses/[slug]/check-payment-status";
import { Suspense } from "react";

interface PaymentSuccessProps {
  searchParams: Promise<{ paymentId?: string }>;
}

async function PaymentStatusChecker({ paymentId }: { paymentId: string }) {
  const result = await checkPaymentStatus(paymentId);

  if (result.status === "error") {
    return (
      <div className="mt-3 text-center sm:mt-5 w-full">
        <h2 className="text-xl font-semibold text-red-600">
          Payment Verification Failed
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {result.message}
        </p>
        <Link
          className={buttonVariants({ className: "w-full mt-5" })}
          href="/dashboard"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  if (result.enrollmentStatus === "Active") {
    return (
      <div className="mt-3 text-center sm:mt-5 w-full">
        <h2 className="text-xl font-semibold">Payment Successful!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          You are now enrolled in <strong>{result.courseTitle}</strong>
        </p>
        <Link
          className={buttonVariants({ className: "w-full mt-5" })}
          href={`/courses/${result.courseSlug}`}
        >
          Start Learning
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 text-center sm:mt-5 w-full">
      <h2 className="text-xl font-semibold">Payment Processing...</h2>
      <p className="text-sm text-muted-foreground mt-2">
        Your payment is still being processed. Please check back in a few
        moments.
      </p>
      <Link
        className={buttonVariants({ className: "w-full mt-5" })}
        href="/dashboard"
      >
        Continue to Dashboard
      </Link>
    </div>
  );
}

export default async function PaymentSuccessful({
  searchParams,
}: PaymentSuccessProps) {
  const params = await searchParams;
  const paymentId = params.paymentId;

  return (
    <div className="w-full min-h-screen flex flex-1 justify-center items-center">
      <Card className="w-[400px]">
        <CardContent className="pt-6">
          <div className="w-full flex justify-center">
            <CheckIcon className="size-12 p-2 bg-green-500/30 text-green-500 rounded-full" />
          </div>
          {paymentId ? (
            <Suspense
              fallback={
                <div className="mt-3 text-center sm:mt-5 w-full">
                  <Loader2 className="size-6 animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Verifying payment...
                  </p>
                </div>
              }
            >
              <PaymentStatusChecker paymentId={paymentId} />
            </Suspense>
          ) : (
            <div className="mt-3 text-center sm:mt-5 w-full">
              <h2 className="text-xl font-semibold">Payment Successful</h2>
              <Link
                className={buttonVariants({ className: "w-full mt-5" })}
                href="/dashboard"
              >
                Continue to Dashboard
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
 