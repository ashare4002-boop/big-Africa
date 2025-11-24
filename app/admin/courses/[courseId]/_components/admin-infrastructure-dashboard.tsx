"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Unlock } from "lucide-react";
import { getInfrastructureAnalytics } from "../actions/enrollment-actions";
import { unlockUserForReEnrollment } from "../actions/enrollment-actions";
import { toast } from "sonner";

interface AdminInfrastructureDashboardProps {
  courseId: string;
}

interface AnalyticsItem {
  id: string;
  name: string;
  town: string;
  capacity: number;
  currentEnrollment: number;
  availableSpots: number;
  isLocked: boolean;
  status: string;
  totalEarnings: number;
  ownerPhoneNumber: string;
  activeEnrollmentsCount: number;
  ejectedUsersCount: number;
  enrolledStudents: unknown[];
  ejectedStudents: unknown[];
}

export function AdminInfrastructureDashboard({ courseId }: AdminInfrastructureDashboardProps) {
  const [analytics, setAnalytics] = useState<AnalyticsItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    const result = await getInfrastructureAnalytics(courseId);
    if (result.status === "success" && result.data) {
      const analyticsData = Array.isArray((result.data as unknown as Record<string, unknown>).analytics)
        ? (result.data as unknown as Record<string, unknown>).analytics as AnalyticsItem[]
        : (result.data as unknown as AnalyticsItem[]);
      setAnalytics(analyticsData);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, [courseId, loadAnalytics]);

  const handleUnlockUser = async (enrollmentId: string) => {
    const result = await unlockUserForReEnrollment(enrollmentId);
    if (result.status === "success") {
      toast.success("User unlocked");
      await loadAnalytics();
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return <div>Loading analytics...</div>;
  }

  const totalCapacity = analytics.reduce((sum: number, a: AnalyticsItem) => sum + a.capacity, 0) || 0;
  const totalEnrolled = analytics.reduce((sum: number, a: AnalyticsItem) => sum + a.currentEnrollment, 0) || 0;
  const totalEarnings = analytics.reduce((sum: number, a: AnalyticsItem) => sum + a.totalEarnings, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCapacity}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Enrolled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEnrolled}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold flex items-center gap-10">
              XAF 
              {totalEarnings.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white">Available Spots</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.max(0, totalCapacity - totalEnrolled)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="infrastructure" className="w-full">
        <TabsList>
          <TabsTrigger value="infrastructure">Infrastructures</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="ejected">Ejected Users</TabsTrigger>
        </TabsList>

        <TabsContent value="infrastructure">
          <div className="grid gap-4">
            {analytics.map((infra: AnalyticsItem) => (
              <Card key={infra.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{infra.name}</CardTitle>
                      <CardDescription>{infra.town}</CardDescription>
                    </div>
                    <Badge variant={infra.status === "OPEN" ? "default" : infra.status === "FULL" ? "secondary" : "destructive"}>
                      {infra.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-sm text-white">Capacity</p>
                      <p className="text-lg font-semibold">{infra.currentEnrollment}/{infra.capacity}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white">Available</p>
                      <p className="text-lg font-semibold">{infra.availableSpots}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white">Earnings</p>
                      <p className="text-lg font-semibold">XAF{infra.totalEarnings.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white">Owner Phone</p>
                      <p className="text-lg font-semibold">{infra.ownerPhoneNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-white">Enrolled</p>
                      <p className="text-lg font-semibold">{infra.activeEnrollmentsCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="space-y-4">
            {analytics.map((infra: AnalyticsItem) => (
              <Card key={infra.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{infra.name} - Enrolled Students ({infra.enrolledStudents.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {infra.enrolledStudents.length > 0 ? (
                    <div className="space-y-2">
                      {infra.enrolledStudents.map((student: any) => (
                        <div key={student.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                            {student.nextPaymentDue && (
                              <p className="text-xs text-orange-600">Payment due: {new Date(student.nextPaymentDue).toLocaleDateString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-white">No enrolled students</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ejected">
          <div className="space-y-4">
            {analytics.map((infra: AnalyticsItem) => (
              infra.ejectedStudents.length > 0 && (
                <Card key={infra.id}>
                  <CardHeader>
                    <CardTitle className="text-lg text-red-600 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      {infra.name} - Ejected Users ({infra.ejectedStudents.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {infra.ejectedStudents.map((student: any) => (
                        <div key={student.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-gray-600">{student.email}</p>
                            <p className="text-xs text-red-600">Ejected {student.ejectionCount}x</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Unlock className="w-4 h-4 mr-2" />
                            Allow Re-Enroll
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
