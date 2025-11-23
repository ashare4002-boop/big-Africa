"use client";
import { tryCatch } from "@/hooks/try-catch";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  courseCategories,
  courseLevel,
  courseSchema,
  CourseSchemaType,
  courseStatus,
  courseTypes,
} from "@/lib/zodSchema";
import { ArrowLeft, Loader2, PlusIcon, SparkleIcon } from "lucide-react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import type { Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import slugify from "slugify";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import { Uploader } from "@/components/file-uploader/Uploader";
import { useTransition } from "react";
import { CreateCourse } from "./action";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { toastWithSound } from "@/utils/toastWithSound";
import { useConfetti } from "@/hooks/use-confetti";

export default function CourseCreationPage() {
  const [pending, startTransition] = useTransition();
  const router  = useRouter();
  const {triggerConfetti} = useConfetti();
  // 1. Define your form.
  const form = useForm<CourseSchemaType>({
      resolver: zodResolver(courseSchema) as unknown as Resolver<CourseSchemaType>,
    defaultValues: {
      title: "",
      description: "",
      filekey: "",
      price: 0,
      duration: 0,
      level: "GCE",
      category: "Skills",
      smallDescription: "",
      slug: "",
      status: "Draft",
      courseType: "NORMAL",
    },
  });


   // 2. Define a submit handler
  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const {data: result, error} = await tryCatch(CreateCourse(values));

      if(error){
        toastWithSound("error", "An unexpected error occurred. Please try again.");
        return;
      }
      
      if(result.status === "success") {
        toast.success(result.message);
        triggerConfetti();
        form.reset()
        router.push('/admin/courses') 

      } else if (result.status === "error") {
            toast.error(result.message);
      }
       
       
    })
  });

  return (
    <>
      <div className="flex items-center gap-4">
        <Link
          href={"/admin/courses"}
          className={buttonVariants({
            variant: "outline",
            size: "icon",
          })}
        >
          <ArrowLeft className="size" />
        </Link>
        <h1 className="text-2xl font-bold">Create Courses</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Basic information</CardTitle>
          <CardDescription>Small description</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...(form as any)}>
            <form className="space-y-6" onSubmit={onSubmit}>
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-4 items-end">
                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Slug</FormLabel>
                      <FormControl>
                        <Input placeholder="Slug" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  className="w-fit"
                  onClick={() => {
                    const titleValue = form.getValues("title");

                    const slug = slugify(titleValue);

                    form.setValue("slug", slug, { shouldValidate: true });
                  }}
                >
                  Generate Slug <SparkleIcon className="ml-1" size={16} />
                </Button>
              </div>
              <FormField
                control={form.control}
                name="smallDescription"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-left">
                      Small Description
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Small Description"
                        className="min-h-[120px]  "
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-left">Description</FormLabel>
                    <FormControl>
                      <RichTextEditor field={field}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="filekey"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-left">Thumbnail image</FormLabel>
                    <FormControl>
                      <Uploader   fileTypeAccepted="image"  onChange={field.onChange} value={field.value}/>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-left">Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {courseCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-left">Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Value" />
                          </SelectTrigger> 
                        </FormControl>
                        <SelectContent>
                          {courseLevel.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
 
                <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-left">Duration (hours)</FormLabel>
                    <FormControl>
                      <Input placeholder="Duration" type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="text-left">Price CFA</FormLabel>
                    <FormControl>
                      <Input placeholder="Price" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              </div>
              <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-left">Status</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger> 
                        </FormControl>
                        <SelectContent>
                          {courseStatus.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              <FormField
                  control={form.control}
                  name="courseType"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel className="text-left">Course Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Course Type" />
                          </SelectTrigger> 
                        </FormControl>
                        <SelectContent>
                          {courseTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type === "NORMAL" ? "Online Course" : "Infrastructure-Based (Physical Learning Centers)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type= "submit" disabled= {pending}>
                  
                {pending ? (
                  <>
                  Creating...

                  <Loader2 className="animate-spin"/>
                  </>
                ): (
                  <>
                  Create Course <PlusIcon className="ml-1" size={16}/> 
                  </>
                )}
                </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </>
  );
}
