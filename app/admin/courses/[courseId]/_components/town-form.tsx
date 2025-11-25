"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTown } from "../actions/infrastructure-actions";

const townSchema = z.object({
  name: z.string().min(2, "Town name must be at least 2 characters"),
});

type TownFormData = z.infer<typeof townSchema>;

interface TownFormProps {
  courseId: string;
  onSuccess?: () => void;
}

export function TownForm({ courseId, onSuccess }: TownFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<TownFormData>({
    resolver: zodResolver(townSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (values: TownFormData) => {
    setIsLoading(true);
    try {
      const result = await createTown(courseId, values.name);

      if (result.status === "success") {
        toast.success(result.message);
        form.reset();
        onSuccess?.();
      } else {
        toast.error(result.message || "Failed to create town. Please check your connection and try again.");
      }
    } catch (error: any) {
      if (!navigator.onLine) {
        toast.error("No internet connection. Please check your connection and try again.");
      } else if (error?.message?.includes("fetch") || error?.message?.includes("network")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else {
        toast.error("Failed to create town. Please try again or contact support.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Town Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Buea, Douala, Yaounde" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Town
        </Button>
      </form>
    </Form>
  );
}
