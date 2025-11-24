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
import { createInfrastructure, updateInfrastructure } from "../actions/infrastructure-actions";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Uploader } from "@/components/file-uploader/Uploader";
import pino from "pino";

const logger = pino();

interface InfrastructureFormProps {
  courseId: string;
  towns: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
  editingId?: string;
  initialData?: any;
}

export function InfrastructureForm({ 
  courseId, 
  towns, 
  onSuccess, 
  editingId,
  initialData 
}: InfrastructureFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [tutors, setTutors] = useState<string[]>(initialData?.tutorNames || [""]); 

  // Create a schema without tutorNames validation (since tutors are managed separately)
  const formSchema = infrastructureSchema.omit({ tutorNames: true });
  
  const form = useForm({
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialData || {
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
      townId: "",
    },
  });

  const onSubmit = async (values: any) => {
    logger.info({ values }, "[DEBUG] ✅ FORM SUBMITTED!");
    
    // Validate tutors
    const validTutors = tutors.filter(t => t.trim());
    if (validTutors.length === 0) {
      logger.warn("[DEBUG] ❌ No tutors provided");
      toast.error("Please add at least one tutor");
      return;
    }

    // Validate images
    if (!values.facilityImageKey?.trim()) {
      logger.warn("[DEBUG] ❌ No facility image");
      toast.error("Please upload a facility image");
      return;
    }

    if (!values.locationImageKey?.trim()) {
      logger.warn("[DEBUG] ❌ No location image");
      toast.error("Please upload a location image");
      return;
    }

    logger.info("[DEBUG] ✅ All client validations passed");
    setIsLoading(true);
    
    try {
      const payload = {
        ...values,
        tutorNames: validTutors,
      };

      logger.info({ payload }, "[DEBUG] 📤 Sending payload to server");

      let result;
      if (editingId) {
        logger.info("[DEBUG] 🔄 Calling updateInfrastructure...");
        result = await updateInfrastructure(editingId, payload);
      } else {
        logger.info("[DEBUG] ➕ Calling createInfrastructure...");
        result = await createInfrastructure({
          ...payload,
          courseId,
        });
      }

      logger.info({ result }, "[DEBUG] 📥 Server response");

      if (result.status === "success") {
        logger.info("[DEBUG] ✅ SUCCESS!");
        toast.success(result.message);
        form.reset();
        setTutors([""]);
        onSuccess?.();
      } else {
        logger.error({ message: result.message }, "[DEBUG] ❌ Server error");
        toast.error(result.message || "Failed to save infrastructure");
      }
    } catch (error) {
      logger.error({ error }, "[DEBUG] ❌ Unexpected error");
      toast.error(`Failed to ${editingId ? 'update' : 'create'} infrastructure`);
    } finally {
      setIsLoading(false);
    }
  };

  const onInvalid = (errors: any) => {
    logger.error({ errors }, "[DEBUG] Form validation failed");
    const errorFields = Object.keys(errors);
    if (errorFields.length > 0) {
      const firstError = errors[errorFields[0]];
      logger.error({ field: errorFields[0], error: firstError }, "[DEBUG] First validation error");
      toast.error(`Validation error: ${errorFields[0]} - ${firstError?.message || 'Invalid field'}`);
    } else {
      toast.error("Please fix the highlighted fields and try again");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit as any, onInvalid)} className="space-y-4">
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
            <FormItem suppressHydrationWarning>
              <FormLabel>Enrollment Deadline</FormLabel>
              <FormControl suppressHydrationWarning>
                <Input 
                  type="datetime-local" 
                  value={field.value instanceof Date ? field.value.toISOString().slice(0, 16) : (field.value || "")}
                  onChange={(e) => {
                    const value = e.target.value;
                    console.log("[DEBUG] DateTime changed to:", value);
                    if (value) {
                      try {
                        const date = new Date(value);
                        console.log("[DEBUG] Converted to Date:", date);
                        field.onChange(date);
                      } catch (err) {
                        console.error("[DEBUG] Date conversion error:", err);
                      }
                    } else {
                      field.onChange(null);
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="facilityImageKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Facility Image</FormLabel>
              <FormControl>
                <Uploader
                  fileTypeAccepted="image"
                  value={field.value}
                  onChange={(value) => field.onChange(value || "")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control as any}
          name="locationImageKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location Image</FormLabel>
              <FormControl>
                <Uploader
                  fileTypeAccepted="image"
                  value={field.value}
                  onChange={(value) => field.onChange(value || "")}
                />
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
          {editingId ? 'Update Infrastructure' : 'Create Infrastructure'}
        </Button>
      </form>
    </Form>
  );
}
