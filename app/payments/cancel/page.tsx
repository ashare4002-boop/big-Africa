import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XIcon } from "lucide-react";
import Link from "next/link";

interface PaymentCancelledProps {
  searchParams: Promise<{ courseSlug?: string }>;
}

export default async function PaymentCancelled({
  searchParams,
}: PaymentCancelledProps) {
  const params = await searchParams;
  const courseSlug = params.courseSlug;

  return (
    <div className="w-full min-h-screen flex flex-1 justify-center items-center">
      <Card className="w-[400px]">
        <CardContent className="pt-6">
          <div className="w-full flex justify-center">
            <XIcon className="size-12 p-2 bg-red-500/30 text-red-500 rounded-full" />
          </div>
          <div className="mt-3 text-center sm:mt-5 w-full">
            <h2 className="text-xl font-semibold">Payment Cancelled</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your payment was cancelled or failed. You can try again anytime.
            </p>
            {courseSlug ? (
              <Link
                className={buttonVariants({ className: "w-full mt-5" })}
                href={`/courses/${courseSlug}`}
              >
                Back to Course
              </Link>
            ) : (
              <Link
                className={buttonVariants({ className: "w-full mt-5" })}
                href="/"
              >
                Go to Homepage
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
 