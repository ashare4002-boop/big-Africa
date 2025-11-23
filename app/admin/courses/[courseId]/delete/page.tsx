"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tryCatch } from "@/hooks/try-catch";
import Link from "next/link";
import { useTransition } from "react";
import { deleteCourse } from "./actions";
import { toastWithSound } from "@/utils/toastWithSound";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export default function DeleteCourseRoute() {
  const [pending, startTransition] = useTransition();
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();

  async function onSubmit() {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(deleteCourse(courseId));

      if (error) {
        toastWithSound(
          "error",
          "An unexpected error occurred. Please try again"
        );
        return;
      }

      const typedResult = result as any;
      if (typedResult?.status === "success") {
        toastWithSound(typedResult.sound || "success", typedResult.message);
        router.push("/admin/courses");
      } else if (typedResult?.status === "error") {
        toastWithSound(typedResult.sound || "error", typedResult.message);
      }
    });
  }

  return (
    <div className="max-w-xl mx-auto w-full">
      <Card className="mt-32">
        <CardHeader>
          <CardTitle>Are sure you want to delete this course</CardTitle>
          <CardDescription>
            This action cannot be undone. Please confirm deletion.
          </CardDescription>
          <CardContent className="flex items-center justify-between">
            <Link
              className={buttonVariants({ variant: "outline" })}
              href={"/admin/courses"}
            >
              Cancel
            </Link>
            <Button disabled={pending} variant="destructive" onClick={onSubmit}>
              {pending ? (
                <>
                  <Loader2 className=" size-4  animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Delete
                </>
              )}
            </Button>
          </CardContent>
        </CardHeader>
      </Card>
    </div>
  );
}
