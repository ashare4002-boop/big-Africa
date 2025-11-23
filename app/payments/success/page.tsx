// app/payments/success/page.tsx

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { ClientStatusPoller } from '@/components/poller/ClientStatusPoller';

interface PaymentSuccessProps {
  searchParams: Promise<{ paymentId?: string }>;
}

export default async function PaymentSuccessful({
  searchParams,
}: PaymentSuccessProps) {
  const params = await searchParams;
  const paymentId = params?.paymentId;

  return (
    <div className="w-full min-h-screen flex flex-1 justify-center items-center">
      <Card className="w-[400px]">
        <CardContent className="pt-6">
          <div className="w-full flex justify-center">
            <CheckIcon className="size-12 p-2 bg-green-500/30 text-green-500 rounded-full" />
          </div>
          {paymentId ? (
            <ClientStatusPoller paymentId={paymentId} />
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