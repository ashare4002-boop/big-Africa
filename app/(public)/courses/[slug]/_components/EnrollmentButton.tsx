"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tryCatch } from "@/hooks/try-catch";
import { toastWithSound } from "@/utils/toastWithSound";
import { Loader2, Phone } from "lucide-react";
import { useState, useTransition } from "react";
import { enrollInCourseAction } from "../actions";

export function EnrollmentButton({ courseId }: { courseId: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    const cleanedPhone = phoneNumber.replace(/\s+/g, "");

    if (!cleanedPhone.match(/^237[6-7]\d{8}$/)) {
      toastWithSound(
        "error",
        "Invalid phone number. Format: 237XXXXXXXXX (MTN or Orange)"
      );
      return;
    }

    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        enrollInCourseAction(courseId, cleanedPhone)
      );

      if (error) {
        toastWithSound(
          "error",
          "An unexpected error occurred. Please try again"
        );
        return;
      }

      if (result.status === "success") {
        toastWithSound(result.sound || "success", result.message);
        setOpen(false);
        setPhoneNumber("");
      } else if (result.status === "error") {
        toastWithSound(result.sound || "error", result.message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Enroll Now</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Enrollment</DialogTitle>
          <DialogDescription>
            Enter your mobile money phone number to pay for this course. You'll
            receive a prompt on your phone to authorize the payment.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Money Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                placeholder="237 6XX XXX XXX"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10"
                disabled={pending}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              MTN: 237 67X XXX XXX | Orange: 237 69X XXX XXX
            </p>
          </div>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Processing Payment...
              </>
            ) : (
              "Proceed to Payment"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}