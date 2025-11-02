import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { tryCatch } from "@/hooks/try-catch";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteLesson } from "../action";
import { toastWithSound } from "@/utils/toastWithSound";

export function DeleteLesson({
  chapterId,
  courseId,
  lessonId,
}: {
  chapterId: string;
  courseId: string;
  lessonId: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onSubmit() {
    startTransition(async () => {
      const { data: result, error } = await tryCatch(
        deleteLesson({
          chapterId,
          courseId,
          lessonId,
        })
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

        setOpen(false); // <--- Closing modal
      } else if (result.status === "error") {
        toastWithSound(result.sound || "error", result.message);
      }
    });
  }
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action is irreversible. Please confirm deletion
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="text-primary">Cancel</AlertDialogCancel>
          <Button   type= "button" onClick={onSubmit} disabled = {pending}  variant="destructive">{pending ? "Deleting..." : "Delete"}</Button> 
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
