import { adminGetCourse } from "@/app/data/admin/admin-get-course";
import { InfrastructureManagement } from "../_components/infrastructure-management";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminInfrastructureDashboard } from "../_components/admin-infrastructure-dashboard";

type Params = Promise<{ courseId: string }>;

export default async function InfrastructureManagementPage({ params }: { params: Params }) {
  const { courseId } = await params;
  const course = await adminGetCourse(courseId);

  // Fetch towns and infrastructures
  const towns = await prisma.town.findMany({
    where: { courseId },
    include: {
      infrastructures: true,
    },
  });

  const infrastructures = await prisma.infrastructure.findMany({
    where: {
      town: {
        courseId,
      },
    },
    include: {
      town: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Infrastructure Management: <span className="text-primary">{course.title}</span>
        </h1>
        <p className="text-gray-600">Manage physical learning locations and student enrollments</p>
      </div>

      {(course as { courseType?: string }).courseType === "INFRASTRUCTURE_BASE" ? (
        <>
          <AdminInfrastructureDashboard courseId={courseId} />
          <InfrastructureManagement
            courseId={courseId}
            courseType={(course as { courseType?: string }).courseType || ""}
            infrastructures={infrastructures.map(i => ({
              id: i.id,
              name: i.name,
              capacity: i.capacity,
              currentEnrollment: i.currentEnrollment,
              location: i.location,
              townId: i.townId,
              townName: i.town?.name,
              ownerPhoneNumber: i.ownerPhoneNumber,
              totalEarnings: i.totalEarnings,
              isLocked: i.isLocked,
            }))}
            towns={towns}
          />
        </>
      ) : (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-900">Not an Infrastructure-Based Course</CardTitle>
            <CardDescription className="text-orange-800">
              This course is configured as an online course. Infrastructure management is only available for infrastructure-based courses.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
