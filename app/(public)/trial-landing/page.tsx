"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function TrialLandingPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-lg shadow-xl p-8 border border-border">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Start Your Free Trial
          </h1>
          <p className="text-muted-foreground mb-8">
            Get 7 days free access to A-Share. No credit card required.
          </p>

          <div className="bg-secondary rounded-lg p-6 mb-8 border border-border">
            <div className="text-5xl font-bold text-primary mb-2">7</div>
            <div className="text-foreground font-semibold">Days Free</div>
            <div className="text-sm text-muted-foreground mt-4">
              Then 1,000 XAF/month for full platform access
            </div>
          </div>

          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-foreground">Access all courses</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-foreground">Learn anytime, anywhere</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-foreground">No payment needed for 7 days</span>
            </div>
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="text-foreground">Cancel anytime</span>
            </div>
          </div>

          <Button asChild className="w-full mb-4">
            <Link href="/login">
              Start Your 7-Day Free Trial
            </Link>
          </Button>

          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
