"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type Params = Promise<{ enrollmentId: string }>;

export default function EnrollmentPaymentPage({ params }: { params: Params }) {
  const resolvedParams = useParams();
  const enrollmentId = resolvedParams?.enrollmentId as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    initializePayment();
  }, [enrollmentId]);

  const initializePayment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/enrollment/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let userMessage = "Failed to initialize payment";
        
        if (response.status === 401) {
          userMessage = "You are not logged in. Please log in and try again.";
        } else if (response.status === 400) {
          userMessage = "Invalid enrollment. Please check your enrollment details and try again.";
        } else if (response.status === 404) {
          userMessage = "Enrollment not found. Please go back and try again.";
        } else if (response.status === 500) {
          userMessage = "Payment service temporarily unavailable. Please try again in a few moments.";
        } else {
          userMessage = errorData.error || "Failed to initialize payment. Please try again or contact support.";
        }
        
        setError(userMessage);
        toast.error(userMessage);
        return;
      }

      const data = await response.json();
      if (!data.paymentLink) {
        throw new Error("Payment link not received from server");
      }
      setPaymentLink(data.paymentLink);
    } catch (err) {
      let errorMessage = "Failed to initialize payment";
      
      if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your connection and try again.";
      } else if (err instanceof TypeError && err.message.includes("fetch")) {
        errorMessage = "Network error. Please check your internet connection and try again.";
      } else if (err instanceof Error) {
        errorMessage = err.message.includes("Payment link") 
          ? "Payment service error. Please try again or contact support."
          : err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Complete Your Enrollment</CardTitle>
            <CardDescription>Proceed to payment to secure your spot</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-900">Payment Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            ) : paymentLink ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900">Ready to Pay</p>
                  <p className="text-sm text-green-700">Click below to proceed to payment</p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900">Initializing Payment</p>
                  <p className="text-sm text-blue-700">Please wait while we set up your payment...</p>
                </div>
              </div>
            )}

            {paymentLink && (
              <Button
                asChild
                size="lg"
                className="w-full"
              >
                <a href={paymentLink} target="_blank" rel="noopener noreferrer">
                  Go to Payment
                </a>
              </Button>
            )}

            {error && (
              <Button onClick={initializePayment} variant="outline" className="w-full">
                Retry
              </Button>
            )}

            <p className="text-xs text-gray-500 text-center">
              You will be redirected to NKWA Pay to complete your payment securely.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
