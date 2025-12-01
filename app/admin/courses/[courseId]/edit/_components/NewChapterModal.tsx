import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { tryCatch } from "@/hooks/try-catch";
import { chapterSchema, ChapterSchemaType } from "@/lib/zodSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { Loader2, Plus } from "lucide-react";
import { useState, useTransition } from "react";
import {  useForm } from "react-hook-form";
import { createChapter } from "../action";
import { toastWithSound } from "@/utils/toastWithSound";

export function NewChapterModal({courseId} : {courseId : string}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, startTransition] = useTransition();

    // 1. Define your form.
    const form = useForm<ChapterSchemaType>({
        resolver: zodResolver(chapterSchema),
      defaultValues: {
       name: "",
       courseId: courseId,
      },
    });

    async function onSubmit(values: ChapterSchemaType) {
      startTransition( async () => {
         const {data: result, error} = await tryCatch(createChapter(values));

         if(error) {
          toastWithSound("error", "An unexpected error occurred. Please try again");
          return;
         }

         if(result.status === "success") {
          toastWithSound(result.sound || "success", result.message);
          form.reset();
          setIsOpen(false); // <--- Closing modal

         } else if(result.status === "error") {
             toastWithSound(result.sound || "error" , result.message);
         }
        });
    }

  function handleOpenChange(open: boolean) {

    if(!open){
      form.reset();
    }
    setIsOpen(open); 
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant= "outline" size= "sm" className="gap-2">
           <Plus className="size-4"/> New Chapter
        </Button>
      </DialogTrigger>
       <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
            <DialogTitle>Create New Chapter</DialogTitle> 
            <DialogDescription>Add a name to the chapter</DialogDescription> 
        </DialogHeader>
              <Form {...form}>
              <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField control={form.control} name = "name" render={
                  ({field}) => (
                   <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="chapter Name" {...field} />
                    </FormControl>
                    <FormMessage />
                   </FormItem>
                  )}/>
                  <DialogFooter>
                     <Button disabled = {pending} type="submit">
                       {pending ? (
                         <>
                           <Loader2 className="size-4 animate-spin mr-2" />
                           Saving...
                         </>
                       ) : (
                         "Save"
                       )}
                     </Button>
                  </DialogFooter>
              </form>
              </Form>
       </DialogContent>
    </Dialog>
  );
}
