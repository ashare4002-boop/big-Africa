"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function TrialLandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Start Your Free Trial
          </h1>
          <p className="text-gray-600 mb-8">
            Get 7 days free access to A-Share. No credit card required.
          </p>

          <div className="bg-indigo-50 rounded-lg p-6 mb-8">
            <div className="text-5xl font-bold text-indigo-600 mb-2">7</div>
            <div className="text-gray-700 font-semibold">Days Free</div>
            <div className="text-sm text-gray-600 mt-4">
              Then 1,000 XAF/month for full platform access
            </div>
          </div>

          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">Access all courses</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">Learn anytime, anywhere</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">No payment needed for 7 days</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
              <span className="text-gray-700">Cancel anytime</span>
            </div>
          </div>

          <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 mb-4">
             <Link href="/login">
              Start Your 7-Day Free Trial
            </Link>
          </Button>

          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-600 hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
