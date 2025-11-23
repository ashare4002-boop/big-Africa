import { getIndividualCourse } from "@/app/data/course/get-course";
import { RenderDescription } from "@/components/rich-text-editor/RenderDescription";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { env } from "@/lib/env";
import {
  IconBook,
  IconCategory,
  IconChartBar,
  IconChevronDown,
  IconClock,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { CheckIcon } from "lucide-react";
import Image from "next/image";

import { checkIfCourseBought } from "@/app/data/user/user-is-enroll";
import Link from "next/link";
import { EnrollmentButton } from "./_components/EnrollmentButton";

type Params = Promise<{ slug: string }>;

export default async function SlugPage({ params }: { params: Params }) {
  const { slug } = await params;
  const course = await getIndividualCourse(slug);
  const isEnrolled = await checkIfCourseBought(course.id);
  const totalLessons =
    (course.chapters as any[])?.reduce(
      (total: number, chapter: any) => total + chapter.lesson.length,
      0
    ) || 0;
  const totalChapters = (course.chapters as any[])?.length || 0;
  const features = [
    "Full-time access",
    "Downloadable resources",
    "Mobile-friendly",
  ];

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 mt-5">
      <div className="order-1 lg:col-span-2">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl shadow-lg">
          <Image
            src={`https://${env.NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES}.fly.storage.tigris.dev/${course.filekey}`}
            alt=""
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        </div>

        <div className="mt-8 space-y-6">
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight">
              {" "}
              {course.title}{" "}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed line-clamp-2">
              {" "}
              {course.smallDescription}{" "}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Badge className="flex items-center gap-1 px-3 py-1">
              <IconChartBar className="size-4" />
              <span> {course.level} </span>
            </Badge>
            <Badge className="flex items-center gap-1 px-3 py-1">
              <IconCategory className="size-4" />
              <span> {course.category} </span>
            </Badge>
            <Badge className="flex items-center gap-1 px-3 py-1">
              <IconClock className="size-4" />
              <span> {course.duration}hours </span>
            </Badge>
          </div>

          <Separator className="my-8" />

          <div className="space-y-6">
            <h2 className="text-2xl font-semibold tracking-tight ">
              Course Description
            </h2>
            <RenderDescription json={JSON.parse(course.description)} />
          </div>
        </div>
        <div className="mt-12 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight">
              Course Content
            </h2>
            <div>
              {totalChapters} chapter
              {totalChapters !== 1 ? "s" : ""}
              {" | "}
              {totalLessons} Lesson
              {totalLessons !== 1 ? "s" : ""}
            </div>
          </div>

          <div className="space-y-4">
            {(course.chapters as any[])?.map((chapter: any, index: number) => (
              <Collapsible key={chapter.id} defaultOpen={index === 0}>
                <Card className="p-0 overflow-hidden border-2 transition-all duration-200 hover:shadow-md gap-0">
                  <CollapsibleTrigger>
                    <div>
                      <CardContent className="p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <p className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary text-semibold">
                              {index + 1}
                            </p>
                            <div>
                              <h3 className="text-xl font-semibold text-left">
                                {" "}
                                {chapter.title}{" "}
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="text-xs">
                              {chapter.lesson.length} lesson
                              {chapter.lesson.length !== 1 ? "s" : ""}
                            </Badge>

                            <IconChevronDown className="size-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t bg-muted/20">
                      <div className="p-6 pt-4 space-y-3">
                        {(chapter.lesson as any[])?.map((lesson: any, lessonIndex: number) => (
                          <div
                            key={lesson.id}
                            className="flex items-center gap-4 rounded-lg p-3 hover:bg-accent transition-colors"
                          >
                            <div className="flex size-8 items-center justify-center rounded-full bg-primary/40 border-2 border-muted">
                              <IconPlayerPlay className="size-4 text-muted-foreground group-hover:text-primary transition-colors group" />
                            </div>

                            <div className="flex-1">
                              <p className="font-medium text-sm">
                                {lesson.title}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Lesson {lessonIndex + 1}{" "}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </div>
      </div>
      {/* Enrollment Card   */}
      <div className="order-2  lg:col-span1">
        <div className="sticky top-20">
          <Card className="py-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="text-lg font-medium">Price:</span>
                <span className="text-2xl font-bold text-primary">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "XAF",
                  }).format(course.price)}
                </span>
              </div>

              <div className="mb-6 space-y-3 rounded-lg bg-muted p-4">
                <h4 className="font medium">What you will get:</h4>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg:primary/30 text-primary ">
                      <IconClock className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Duration</p>
                      <p className="text-sm text-muted-foreground">
                        {course.duration} hours
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg:primary/30 text-primary ">
                      <IconChartBar className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Level</p>
                      <p className="text-sm text-muted-foreground">
                        {course.level}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg:primary/30 text-primary ">
                      <IconCategory className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Category</p>
                      <p className="text-sm text-muted-foreground">
                        {course.category}
                      </p>
                    </div>
                  </div> 

                  <div className="flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg:primary/30 text-primary ">
                      <IconBook className="size-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Lessons</p>
                      <p className="text-sm text-muted-foreground">
                        {totalLessons} Lesson
                        {totalLessons !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <h4>This course include:</h4>
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <div className="rounded-full bg-primary/10 text-primary p-1">
                        <CheckIcon className="size-3" />
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                {isEnrolled ? (
                  <Link className= {buttonVariants({ className :  "w-full" })} href="/dashboard">Start now</Link>
                ) : (
                  <EnrollmentButton courseId={course.id} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
