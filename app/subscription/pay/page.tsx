"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SubscriptionPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/";
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/subscription/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redirectUrl: redirectUrl || "/",
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Please log in to continue");
          return;
        }
        toast.error("Unable to process payment at this time. Please try again.");
        return;
      }

      const { paymentLink } = await response.json();
      if (paymentLink) {
        window.location.href = paymentLink;
      }
    } catch (error) {
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Platform Subscription
            </h1>
            <p className="text-gray-600 mt-2">
              Unlock full access to all A-Share courses
            </p>
          </div>

          <div className="bg-indigo-50 rounded-lg p-6">
            <div className="text-4xl font-bold text-indigo-600">1,000 XAF</div>
            <div className="text-gray-700 mt-2">/month</div>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Trial Ended</p>
                <p className="text-sm text-gray-600 mt-1">
                  Your 7-day free trial has expired. Subscribe now to continue accessing courses.
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handlePayment}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Pay with NKWA Pay"
            )}
          </Button>

          <p className="text-xs text-center text-gray-600">
            Secure payment processed by NKWA Pay
          </p>
        </div>
      </Card>
    </div>
  );
}
