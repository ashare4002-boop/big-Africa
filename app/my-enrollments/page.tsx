"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, User, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getUserInfrastructureEnrollments } from "@/app/admin/courses/[courseId]/actions/student-enrollment-actions";

interface EnrollmentData {
  id: string;
  status: string;
  amount: number;
  courseId: string;
  infrastructureId?: string;
  Course?: { title: string };
  infrastructure?: { name: string; town: { name: string } };
  nextPaymentDue?: string;
  isEjected?: boolean;
}

export default function MyEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEnrollments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEnrollments = async () => {
    try {
      const result = await getUserInfrastructureEnrollments();
      if (result.status === "success" && result.data) {
        setEnrollments((result.data as any).enrollments || []);
      }
    } catch (error) {
      toast.error("Failed to load enrollments");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading your enrollments...</div>;
  }

  const infrastructureEnrollments = enrollments.filter(e => e.infrastructureId);
  const activeEnrollments = infrastructureEnrollments.filter(e => e.status === "Active" && !e.isEjected);
  const pendingEnrollments = infrastructureEnrollments.filter(e => e.status === "Pending");
  const expiredEnrollments = infrastructureEnrollments.filter(e => e.isEjected);

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Enrollments</h1>
        <p className="text-gray-600">Manage your infrastructure-based course enrollments</p>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active ({activeEnrollments.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingEnrollments.length})</TabsTrigger>
          <TabsTrigger value="expired">Ejected ({expiredEnrollments.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeEnrollments.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <p>No active enrollments. Browse courses to get started!</p>
            </Card>
          ) : (
            activeEnrollments.map(enrollment => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} status="active" />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingEnrollments.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <p>No pending payments.</p>
            </Card>
          ) : (
            pendingEnrollments.map(enrollment => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} status="pending" />
            ))
          )}
        </TabsContent>

        <TabsContent value="expired" className="space-y-4">
          {expiredEnrollments.length === 0 ? (
            <Card className="p-8 text-center text-gray-500">
              <p>No ejected enrollments.</p>
            </Card>
          ) : (
            expiredEnrollments.map(enrollment => (
              <EnrollmentCard key={enrollment.id} enrollment={enrollment} status="expired" />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EnrollmentCard({
  enrollment,
  status,
}: {
  enrollment: EnrollmentData;
  status: "active" | "pending" | "expired";
}) {
  const statusConfig = {
    active: { variant: "default", icon: CheckCircle, label: "Active" },
    pending: { variant: "secondary", icon: AlertCircle, label: "Pending Payment" },
    expired: { variant: "destructive", icon: AlertCircle, label: "Ejected" },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{enrollment.Course?.title}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <MapPin className="w-4 h-4" />
              {enrollment.infrastructure?.town.name} • {enrollment.infrastructure?.name}
            </CardDescription>
          </div>
          <Badge variant={config.variant as any} className="flex items-center gap-1">
            <Icon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Monthly Fee</p>
            <p className="text-lg font-semibold">XAF {enrollment.amount?.toLocaleString()}</p>
          </div>
          {enrollment.nextPaymentDue && (
            <div>
              <p className="text-sm text-gray-600">Next Payment Due</p>
              <p className="text-lg font-semibold flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(enrollment.nextPaymentDue).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>

        {status === "pending" && (
          <Button className="w-full" asChild>
            <a href={`/enrollment/${enrollment.id}/pay`}>Complete Payment</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
