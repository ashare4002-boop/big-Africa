// components/ClientStatusPoller.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { buttonVariants } from "@/components/ui/button";

// Define the return type for the status check API (matching your /api/enrollment/status response)
interface StatusResult {
  status: "Pending" | "Active" | "Cancelled" | "Failed" | "Not_Found" | "Error";
  courseTitle?: string;
  courseSlug?: string;
  message?: string;
}

const POLLING_INTERVAL = 4000; // Poll every 4 seconds

// Function to fetch status from your custom endpoint
const fetchStatus = async (id: string): Promise<StatusResult> => {
  // This calls the API endpoint: /api/enrollment/status/route.ts
  const response = await fetch(`/api/enrollment/status?paymentId=${id}`);
  if (!response.ok) {
    return { status: "Error", message: `Server error: ${response.status}` };
  }
  return response.json();
};

export function ClientStatusPoller({ paymentId }: { paymentId: string }) {
  const [currentStatus, setCurrentStatus] =
    useState<StatusResult["status"]>("Pending");
  const [courseInfo, setCourseInfo] = useState<{
    title?: string;
    slug?: string;
  }>({});
  const [message, setMessage] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    // Start polling interval to repeatedly check fulfillment status
    const intervalId = setInterval(() => {
      fetchStatus(paymentId)
        .then((result) => {
          setCurrentStatus(result.status);
          if (result.courseTitle && result.courseSlug) {
            setCourseInfo({
              title: result.courseTitle,
              slug: result.courseSlug,
            });
          }
          if (result.message) {
            setMessage(result.message);
          }

          if (result.status === "Active") {
            clearInterval(intervalId);
            // Show toast notification to check email for receipt
            toast.success("Payment confirmed! Check your email for your receipt and enrollment details.", {
              duration: 5000,
              position: "top-center",
            });
            if (result.courseSlug) {
              router.push(`/courses/${result.courseSlug}`);
            } else {
              router.push(`/dashboard`);
            }
          } else if (
            result.status === "Cancelled" ||
            result.status === "Failed"
          ) {
            clearInterval(intervalId);
            setMessage(
              result.message ||
                "Payment failed or was cancelled. Please try again or check your dashboard."
            );
          }
        })
        .catch((error) => {
          console.error("Polling fetch failed:", error);
        });
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [paymentId, router]);

  // --- Render logic based on current polling status ---

  if (currentStatus === "Active") {
    // This state is temporary, usually seen right before the router.push() executes
    return (
      <div className="mt-3 text-center sm:mt-5 w-full">
        <h2 className="text-xl font-semibold">Payment Successful!</h2>
        <p className="text-sm text-muted-foreground mt-2">
          You are now enrolled in <strong>{courseInfo.title}</strong>
        </p>
        <p className="text-sm text-blue-600 mt-2">Redirecting you now...</p>
        <Link
          className={buttonVariants({ className: "w-full mt-5" })}
          href={`/courses/${courseInfo.slug}`}
        >
          Start Learning (Manual Link)
        </Link>
      </div>
    );
  }

  if (currentStatus === "Cancelled" || currentStatus === "Failed") {
    return (
      <div className="mt-3 text-center sm:mt-5 w-full">
        <h2 className="text-xl font-semibold text-red-600">
          Payment Verification Failed
        </h2>
        <p className="text-sm text-muted-foreground mt-2">
          {message ||
            "Payment failed or was cancelled. Please check your dashboard."}
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

  // Default: PENDING, Waiting, or initial state
  return (
    <div className="mt-3 text-center sm:mt-5 w-full">
      <Loader2 className="size-6 animate-spin mx-auto text-blue-600" />
      <h2 className="text-xl font-semibold mt-3">Payment Processing...</h2>
      <p className="text-sm text-muted-foreground mt-2">
        We are awaiting final confirmation. Please wait...
      </p>
      <Link
        className={buttonVariants({ className: "w-full mt-5" })}
        href="/dashboard"
      >
        Continue to dashboard (Manual Check)
      </Link>
    </div>
  );
}
