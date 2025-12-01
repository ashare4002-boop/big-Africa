import { EmptyState } from "@/components/general/EmptyState";
import { getAllCourses } from "../data/course/get-all-courses";
import { getEnrolledCourses } from "../data/user/get-enrolled-courses";
import { PublicCourseCard } from "../(public)/_components/PublicCourseCard";

export default async function DashboardPage() {
  const [courses, enrolledCourses] = await Promise.all([
    getAllCourses(),
    getEnrolledCourses(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text3xl font-bold">Enrolled Courses</h1>
      </div>

      {enrolledCourses.length === 0 ? (
        <EmptyState
          title="No courses purchased"
          buttonText="Browse Courses"
          href="/courses"
          description="You have purchase a course yet"
        />
      ) : (
        <p>The courses you are enrolled in</p> // This need a component
      )}

      <section className="mt-10">
        <div className="flex flex-col gap-2 mb-5">
          <h1 className="text3xl font-bold">Available Courses</h1>
        </div>

        {courses.filter(
          (course) =>
            !enrolledCourses.some(
              ({ Course: enrolled }) => enrolled.id === course.id
            )
        ).length === 0 ? (
          <EmptyState
            title="No courses"
            description="You have already purchase all available course"
            buttonText="Browse Courses"
            href="/courses"
          />
        ) : (
          <div className="grid grid col-1 md:grid-cols-2 gap-6">
             {courses.filter(
          (course) =>
            !enrolledCourses.some(
              ({ Course: enrolled }) => enrolled.id === course.id
            )
        ).map((course) => (
         <PublicCourseCard key ={course.id} data ={course}/>
        ))}
          </div>
        )}
      </section>
    </>
  );
}
