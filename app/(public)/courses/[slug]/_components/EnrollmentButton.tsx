"use client";

import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { toastWithSound } from "@/utils/toastWithSound";
import { useTransition } from "react";
import { enrollInCourseAction } from "../actions";
import { Loader2 } from "lucide-react";

export function EnrollmentButton({courseId} : {courseId:string}) {

    const [pending, startTransition] = useTransition();
     
  function onSubmit() {
      startTransition(async () => {
        const { data: result, error } = await tryCatch(
          enrollInCourseAction(courseId)
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
        } else if (result.status === "error") {
          toastWithSound(result.sound || "error", result.message);
        }
      });
    }
    return  <Button  onClick={onSubmit} disabled={pending} className="w-full"> {pending? (
          <>
        <Loader2 className="size-4 animate-spin"/>
        Loading...
        </>
    ):  (
        "Enroll Now"
    )} </Button>
}