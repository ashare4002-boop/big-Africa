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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, MapPin, Edit2, Trash2 } from "lucide-react";
import { InfrastructureForm } from "./infrastructure-form";
import { TownForm } from "./town-form";
import { deleteInfrastructure } from "../actions/infrastructure-actions";
import { toast } from "sonner";

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
  const [openTownDialog, setOpenTownDialog] = useState(false);
  const [editingInfra, setEditingInfra] = useState<Infrastructure | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async (infrastructureId: string) => {
    setIsDeleting(true);
    try {
      const result = await deleteInfrastructure(infrastructureId);
      if (result.status === "success") {
        toast.success(result.message);
        setDeleteConfirmId(null);
        onInfrastructureUpdate?.();
      } else {
        toast.error(result.message || "Failed to delete learning center. Please try again.");
      }
    } catch (error: any) {
      if (!navigator.onLine) {
        toast.error("No internet connection. Please check your connection and try again.");
      } else if (error?.message?.includes("fetch") || error?.message?.includes("network")) {
        toast.error("Network error. Please check your internet connection and try again.");
      } else {
        toast.error("Failed to delete learning center. Please try again or contact support.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

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
      {towns.length === 0 && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10">
          <CardHeader>
            <CardTitle className="text-primary flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Create Towns First
            </CardTitle>
            <CardDescription className="text-foreground/70">
              Start by creating one or more towns (geographic regions) where you'll add learning centers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={openTownDialog} onOpenChange={setOpenTownDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Town
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a Town</DialogTitle>
                  <DialogDescription>Add a geographic region for your learning centers</DialogDescription>
                </DialogHeader>
                <TownForm
                  courseId={courseId}
                  onSuccess={() => {
                    setOpenTownDialog(false);
                    onInfrastructureUpdate?.();
                  }}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Infrastructure Management</CardTitle>
          <CardDescription>Manage physical learning locations for this course</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-700/30 p-4 rounded-lg">
              <p className="text-sm text-white">Total Capacity</p>
              <p className="text-2xl font-bold text-white">{capacityUsage.total}</p>
            </div>
            <div className="bg-gradient-to-br from-green-900/20 to-green-800/10 border border-green-700/30 p-4 rounded-lg">
              <p className="text-sm text-white">Currently Enrolled</p>
              <p className="text-2xl font-bold text-white">{capacityUsage.used}</p>
            </div>
            <div className={`border ${isFull ? 'bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30' : 'bg-gradient-to-br from-orange-900/20 to-orange-800/10 border-orange-700/30'} p-4 rounded-lg`}>
              <p className="text-sm text-white">Available Spots</p>
              <p className="text-2xl font-bold text-white">{Math.max(0, capacityUsage.total - capacityUsage.used)}</p>
              {isFull && <p className="text-xs text-red-300 mt-1">Course is FULL</p>}
            </div>
          </div>

          {towns.length > 0 && (
            <>
              <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Infrastructure
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full">
                  <DialogHeader>
                    <DialogTitle>Add Infrastructure</DialogTitle>
                    <DialogDescription>Create a new physical learning location</DialogDescription>
                  </DialogHeader>
                  <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-4">
                    <InfrastructureForm
                      courseId={courseId}
                      towns={towns}
                      onSuccess={() => {
                        setOpenDialog(false);
                        onInfrastructureUpdate?.();
                      }}
                    />
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={openTownDialog} onOpenChange={setOpenTownDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add More Towns
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add a New Town</DialogTitle>
                    <DialogDescription>Create another geographic region</DialogDescription>
                  </DialogHeader>
                  <TownForm
                    courseId={courseId}
                    onSuccess={() => {
                      setOpenTownDialog(false);
                      onInfrastructureUpdate?.();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
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
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditingInfra(infra)}>
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <div className="max-h-[70vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Infrastructure</DialogTitle>
                          <DialogDescription>Update infrastructure details</DialogDescription>
                        </DialogHeader>
                        {editingInfra && (
                          <InfrastructureForm
                            courseId={courseId}
                            towns={towns}
                            editingId={editingInfra.id}
                            initialData={{
                              name: editingInfra.name,
                              townId: editingInfra.townId,
                              capacity: editingInfra.capacity,
                              location: editingInfra.location,
                              publicContact: "",
                              privateContact: "",
                              ownerPhoneNumber: editingInfra.ownerPhoneNumber,
                              duration: 1,
                              durationType: "MONTHS",
                              enrollmentDeadline: "",
                              facilityImageKey: "",
                              locationImageKey: "",
                            }}
                            onSuccess={() => {
                              setEditingInfra(null);
                              onInfrastructureUpdate?.();
                            }}
                          />
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  <AlertDialog open={deleteConfirmId === infra.id} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="gap-2"
                      onClick={() => setDeleteConfirmId(infra.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Infrastructure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{infra.name}</strong>. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <div className="flex gap-2 justify-end">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(infra.id)}
                          disabled={isDeleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
