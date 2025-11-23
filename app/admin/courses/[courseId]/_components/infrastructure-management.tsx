"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { InfrastructureForm } from "./infrastructure-form";

interface Infrastructure {
  id: string;
  name: string;
  capacity: number;
  currentEnrollment: number;
  location: string;
  townId: string;
  townName?: string;
  ownerPhoneNumber: string;
  totalEarnings: number;
  isLocked: boolean;
}

interface InfrastructureManagementProps {
  courseId: string;
  courseType: string;
  infrastructures: Infrastructure[];
  towns: Array<{ id: string; name: string }>;
  onInfrastructureUpdate?: () => void;
}

export function InfrastructureManagement({
  courseId,
  courseType,
  infrastructures = [],
  towns = [],
  onInfrastructureUpdate,
}: InfrastructureManagementProps) {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (courseType !== "INFRASTRUCTURE_BASE") {
    return null;
  }

  const capacityUsage = infrastructures.reduce((acc, inf) => {
    return {
      total: acc.total + inf.capacity,
      used: acc.used + inf.currentEnrollment,
    };
  }, { total: 0, used: 0 });

  const isFull = capacityUsage.total > 0 && capacityUsage.used >= capacityUsage.total;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Infrastructure Management</CardTitle>
          <CardDescription>Manage physical learning locations for this course</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Total Capacity</p>
              <p className="text-2xl font-bold">{capacityUsage.total}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Currently Enrolled</p>
              <p className="text-2xl font-bold">{capacityUsage.used}</p>
            </div>
            <div className={`${isFull ? 'bg-red-50' : 'bg-orange-50'} p-4 rounded-lg`}>
              <p className="text-sm text-gray-600">Available Spots</p>
              <p className="text-2xl font-bold">{Math.max(0, capacityUsage.total - capacityUsage.used)}</p>
              {isFull && <p className="text-xs text-red-600 mt-1">Course is FULL</p>}
            </div>
          </div>

          <Dialog open={openDialog} onOpenChange={setOpenDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Infrastructure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Infrastructure</DialogTitle>
                <DialogDescription>Create a new physical learning location</DialogDescription>
              </DialogHeader>
              <InfrastructureForm
                courseId={courseId}
                towns={towns}
                onSuccess={() => {
                  setOpenDialog(false);
                  onInfrastructureUpdate?.();
                }}
              />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {infrastructures.length > 0 && (
        <div className="grid gap-4">
          <h3 className="font-semibold">Infrastructures ({infrastructures.length})</h3>
          {infrastructures.map((infra) => (
            <Card key={infra.id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold">{infra.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Town</p>
                    <p className="font-semibold">{infra.townName || infra.townId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Capacity</p>
                    <p className="font-semibold">{infra.currentEnrollment}/{infra.capacity}</p>
                    <p className={`text-xs ${infra.currentEnrollment >= infra.capacity ? 'text-red-600' : 'text-green-600'}`}>
                      {infra.currentEnrollment >= infra.capacity ? 'FULL' : 'OPEN'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Earnings</p>
                    <p className="font-semibold">${infra.totalEarnings.toFixed(2)}</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
