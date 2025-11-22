import { SectionCards } from "@/components/sidebar/section-cards";
import { ChartAreaInteractive } from "@/components/sidebar/chart-area-interactive";
import { adminEnrollmentStats } from "../data/admin/admin-get-enrollments-stats";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default async function AdminIndexPage() {
  const enrollmentData = await adminEnrollmentStats();
  return (
    <>
      <SectionCards />

      <ChartAreaInteractive data={enrollmentData}/> 
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recent Courses</h2>
          <Link className= {buttonVariants({variant: "outline"})} href="/admin/courses">View All Courses</Link>
        </div>
        </div>
    </>
  );
}
 