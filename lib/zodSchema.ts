import { z } from "zod";

export const courseLevel = [
  "BAC",
  "GCE",
  "Probatoire",
  "Concour",
  "Beginner",
  "Intermediate",
  "Advanced",
  "none",
] as const;

export const courseStatus = ["Draft", "Published", "Archived"] as const;

export const courseCategories = [
  "Concour",
  "Development",
  "Business",
  "Finance & Accounting",
  "Software",
  "Office Productivity",
  "Productivity",
  "Personal Development",
  "Skills",
  "Technical",
  "Design",
  "Marketing",
  "Lifestyle",
  "Photography & Video",
  "Health & Fitness",
  "Music",
  "Teaching & Academics",
  "Language Learning",
  "Computer Science",
  "Cinema",
  "Sports",
  "GCE O/L Science",
  "GCE O/L Arts",
  "GCE O/L Commercial",
  "GCE O/L Technical",
  "GCE A/L Science",
  "GCE A/L Commercial",
  "GCE A/L Arts",
  "GCE A/L Technical",
  "BAC C",
  "BAC D",
  "BAC A",
  "BAC Technique",
  "Probatoire C",
  "Probatoire D",
  "Probatoire A",
  "Probatoire Technique",
  "none",
] as const;

export const courseSchema = z.object({
  title: z
    .string()
    .min(3, { message: "The title should be at least 3 characters long" })
    .max(100, { message: "The title must be at most 100 characters long" }),

  description: z
    .string()
    .min(3, { message: "The description should be at least 3 characters long" }),

  filekey: z.string().min(1, { message: "File is required" }),

  
  price: z.coerce.number().min(0).max(1000000),

  duration: z.coerce.number().min(1).max(500,{ message: "Duration must be between 1 and 500 hours" }),

  level: z.enum(courseLevel),

  category: z.enum(courseCategories, {
    message: "Category is required",
  }),

  smallDescription: z
    .string()
    .min(3, {
      message: "The small description should be at least 3 characters long",
    })
    .max(200, { message: "The small description must be at most 200 characters long" }),

  slug: z.string().min(3, {
    message: "The slug should be at least 3 characters long",
  }),

  status: z.enum(courseStatus, {
    message: "Status is required",
  }),
});

export const chapterSchema = z.object({
  name: z.string().min(3, {message: "The name must be at lest 3 characters long"}),
  courseId: z.string().uuid({message: "Invalid course id"}), // <---- why uuid is marked as deprecated?
});

export const lessonSchema = z.object({
  name: z.string().min(3, {message: "The name must be at lest 3 characters long"}),
  courseId: z.string().uuid({message: "Invalid course id"}),
  chapterId: z.string().uuid({message: "Invalid chapter id"}), // <---- why uuid is marked as deprecated?
  description: z.string().min(3, {message: "The description must be at least 3 characters long"}).optional(),
  thumbnailKey: z.string().optional(),
  videoKey: z.string().optional(),

})


export type CourseSchemaType = z.infer<typeof courseSchema>;
export type ChapterSchemaType = z.infer<typeof chapterSchema>;
export type LessonSchemaType = z.infer<typeof lessonSchema>;
