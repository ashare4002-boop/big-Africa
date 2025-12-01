"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar,  AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { enrollInInfrastructureBaseCourse } from "@/app/admin/courses/[courseId]/actions/student-enrollment-actions";

interface InfrastructureEnrollmentCardProps {
  courseId: string;
  courseName: string;
  infrastructure: {
    id: string;
    name: string;
    location: string;
    capacity: number;
    currentEnrollment: number;
    ownerPhoneNumber: string;
    tutorNames: string[];
    enrollmentDeadline?: Date;
  };
  townName: string;
}

export function InfrastructureEnrollmentCard({
  courseId,
  courseName,
  infrastructure,
  townName,
}: InfrastructureEnrollmentCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const spotsAvailable = infrastructure.capacity - infrastructure.currentEnrollment;
  const isFull = spotsAvailable <= 0;
  const isDeadlinePassed = infrastructure.enrollmentDeadline && new Date() > infrastructure.enrollmentDeadline;
  const isLocked = isFull || isDeadlinePassed;

  const handleEnroll = async () => {
    setIsLoading(true);
    try {
      const result = await enrollInInfrastructureBaseCourse(
        courseId,
        infrastructure.id,
        "town-id" // townId - placeholder, actual towns handled by infrastructure
      );

      if (result.status === "success") {
        toast.success("Enrollment initiated! Redirecting to payment...");
        // Redirect to payment
        const enrollmentId = (result.data as any)?.enrollmentId;
        if (enrollmentId) {
          window.location.href = `/enrollment/${enrollmentId}/pay`;
        }
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("Failed to enroll");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={`${isLocked ? "opacity-60" : ""}`}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{infrastructure.name}</CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {infrastructure.location} • {townName}
            </CardDescription>
          </div>
          {isLocked && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {isFull ? "FULL" : "CLOSED"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Available Spots</p>
            <p className="text-2xl font-bold">{Math.max(0, spotsAvailable)}/{infrastructure.capacity}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Instructor(s)</p>
            <p className="text-sm font-semibold">{infrastructure.tutorNames.slice(0, 2).join(", ")}</p>
          </div>
        </div>

        <div className="border-t pt-3 space-y-2">
          <p className="text-sm text-gray-700">
            <strong>Owner Contact:</strong> {infrastructure.ownerPhoneNumber}
          </p>
          {infrastructure.enrollmentDeadline && (
            <p className="text-sm text-orange-600 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Enroll by: {new Date(infrastructure.enrollmentDeadline).toLocaleDateString()}
            </p>
          )}
        </div>

        <Button
          onClick={handleEnroll}
          disabled={isLocked || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : isLocked ? (
            "Not Available"
          ) : (
            "Enroll Now"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
