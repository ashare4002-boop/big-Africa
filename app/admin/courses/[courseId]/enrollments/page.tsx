import { getCourseEnrollments } from "../actions/enrollment-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type Params = Promise<{ courseId: string }>;

export default async function CourseEnrollmentsPage({ params }: { params: Params }) {
  const { courseId } = await params;
  const result = await getCourseEnrollments(courseId);

  if (result.status === "error") {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-800">{result.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const course = result.data?.course as any;

  if (!course) {
    return <div className="p-6 text-center">Course not found</div>;
  }

  const enrollments = course.enrollment || [];
  const infrastructureCourseEnrollments = enrollments.filter((e: any) => e.infrastructure);
  const normalCourseEnrollments = enrollments.filter((e: any) => !e.infrastructure);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">{course.title} - Enrollments</h1>
        <p className="text-muted-foreground mt-2">
          Total: {enrollments.length} | Infrastructure-Based: {infrastructureCourseEnrollments.length} | Normal: {normalCourseEnrollments.length}
        </p>
      </div>

      {/* Infrastructure-Based Enrollments */}
      {course.courseType === "INFRASTRUCTURE_BASE" && infrastructureCourseEnrollments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Infrastructure-Based Enrollments</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-muted">
                <tr>
                  <th className="border p-3 text-left font-semibold">Student</th>
                  <th className="border p-3 text-left font-semibold">Infrastructure</th>
                  <th className="border p-3 text-left font-semibold">Status</th>
                  <th className="border p-3 text-left font-semibold">Payment Amount</th>
                  <th className="border p-3 text-left font-semibold">Next Payment Due</th>
                  <th className="border p-3 text-left font-semibold">Ejected</th>
                </tr>
              </thead>
              <tbody>
                {infrastructureCourseEnrollments.map((enrollment: any) => (
                  <tr key={enrollment.id} className="border-b hover:bg-muted/50">
                    <td className="border p-3">
                      <div>
                        <p className="font-medium">{enrollment.User?.name}</p>
                        <p className="text-sm text-muted-foreground">{enrollment.User?.email}</p>
                      </div>
                    </td>
                    <td className="border p-3">
                      <div>
                        <p className="font-medium">{enrollment.infrastructure?.name}</p>
                        <p className="text-sm text-muted-foreground">{enrollment.infrastructure?.town?.name}</p>
                      </div>
                    </td>
                    <td className="border p-3">
                      <Badge
                        variant={enrollment.status === "Active" ? "default" : "outline"}
                        className={
                          enrollment.status === "Active"
                            ? "bg-green-600"
                            : enrollment.status === "Pending"
                              ? "bg-yellow-600"
                              : "bg-red-600"
                        }
                      >
                        {enrollment.status}
                      </Badge>
                    </td>
                    <td className="border p-3">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "XAF",
                      }).format(enrollment.amount)}
                    </td>
                    <td className="border p-3 text-sm">
                      {enrollment.nextPaymentDue ? new Date(enrollment.nextPaymentDue).toLocaleDateString() : "-"}
                    </td>
                    <td className="border p-3">
                      <Badge variant={enrollment.isEjected ? "destructive" : "outline"}>
                        {enrollment.isEjected ? "Yes" : "No"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Normal Enrollments */}
      {normalCourseEnrollments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Normal Enrollments</h2>
          <div className="grid gap-4">
            {normalCourseEnrollments.map((enrollment: any) => (
              <Card key={enrollment.id}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{enrollment.User?.name}</p>
                      <p className="text-sm text-muted-foreground">{enrollment.User?.email}</p>
                    </div>
                    <Badge
                      variant={enrollment.status === "Active" ? "default" : "outline"}
                      className={
                        enrollment.status === "Active"
                          ? "bg-green-600"
                          : enrollment.status === "Pending"
                            ? "bg-yellow-600"
                            : "bg-red-600"
                      }
                    >
                      {enrollment.status}
                    </Badge>
                  </div>
                  <p className="text-sm mt-2">
                    Amount: {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "XAF",
                    }).format(enrollment.amount)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {enrollments.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            No enrollments yet
          </CardContent>
        </Card>
      )}

      <Link href={`/admin/courses/${courseId}`}>
        <Button variant="outline">Back to Course</Button>
      </Link>
    </div>
  );
}
