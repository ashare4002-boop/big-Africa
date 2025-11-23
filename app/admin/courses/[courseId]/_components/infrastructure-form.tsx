"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { infrastructureSchema, InfrastructureSchemaType, durationTypes } from "@/lib/zodSchema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createInfrastructure } from "../actions/infrastructure-actions";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface InfrastructureFormProps {
  courseId: string;
  towns: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export function InfrastructureForm({ courseId, towns, onSuccess }: InfrastructureFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tutors, setTutors] = useState<string[]>([""]); 

  const form = useForm({
    resolver: zodResolver(infrastructureSchema) as any,
    defaultValues: {
      name: "",
      capacity: 1,
      location: "",
      publicContact: "",
      privateContact: "",
      ownerPhoneNumber: "",
      facilityImageKey: "",
      locationImageKey: "",
      durationType: "MONTHS",
      duration: 1,
      tutorNames: [],
      townId: "",
    },
  });

  const onSubmit = async (values: any) => {
    setIsLoading(true);
    try {
      const result = await createInfrastructure({
        ...values,
        courseId,
        tutorNames: tutors.filter(t => t.trim()),
      });

      if (result.status === "success") {
        toast.success(result.message);
        onSuccess?.();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to create infrastructure");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
        <FormField
          control={form.control as any}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Infrastructure Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Buea Center A" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="townId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Town</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a town" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {towns.map((town) => (
                    <SelectItem key={town.id} value={town.id}>
                      {town.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Capacity</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location Address</FormLabel>
                <FormControl>
                  <Input placeholder="Street address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="publicContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Public Contact (Email)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="student@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="privateContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Private Contact (Admin)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="admin@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control as any}
          name="ownerPhoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Owner Phone (Cameroon)</FormLabel>
              <FormControl>
                <Input placeholder="+237 6XX XXX XXX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control as any}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration</FormLabel>
                <FormControl>
                  <Input type="number" min="1" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control as any}
            name="durationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duration Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {durationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control as any}
          name="enrollmentDeadline"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Enrollment Deadline</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel className="mb-2 block">Tutor Names</FormLabel>
          <div className="space-y-2">
            {tutors.map((tutor, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  placeholder="Tutor name"
                  value={tutor}
                  onChange={(e) => {
                    const newTutors = [...tutors];
                    newTutors[idx] = e.target.value;
                    setTutors(newTutors);
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTutors(tutors.filter((_, i) => i !== idx))}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTutors([...tutors, ""])}
            >
              Add Tutor
            </Button>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Create Infrastructure
        </Button>
      </form>
    </Form>
  );
}
