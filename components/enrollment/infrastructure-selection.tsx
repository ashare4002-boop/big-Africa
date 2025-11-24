"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MapPin, Users, Clock, AlertCircle } from "lucide-react";

interface Infrastructure {
  id: string;
  name: string;
  capacity: number;
  currentEnrollment: number;
  location: string;
  publicContact: string;
  facilityImageKey: string;
  locationImageKey: string;
  tutorNames: string[];
  openTime?: string;
  closeTime?: string;
  enrollmentDeadline?: string;
}

interface Town {
  id: string;
  name: string;
  infrastructures: Infrastructure[];
}

interface InfrastructureSelectionProps {
  towns: Town[];
  onSelect: (infrastructureId: string, townId: string) => Promise<void>;
  courseTitle: string;
}

export function InfrastructureSelection({
  towns,
  onSelect,
  courseTitle,
}: InfrastructureSelectionProps) {
  const [selectedTownId, setSelectedTownId] = useState<string>("");
  const [selectedInfraId, setSelectedInfraId] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const selectedTown = towns.find((t) => t.id === selectedTownId);
  const selectedInfra = selectedTown?.infrastructures.find((i) => i.id === selectedInfraId);

  const handleConfirmEnrollment = async () => {
    if (!selectedInfraId || !selectedTownId) return;

    setIsLoading(true);
    try {
      await onSelect(selectedInfraId, selectedTownId);
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Select Your Learning Location</CardTitle>
          <CardDescription>Choose the town and infrastructure where you'll attend {courseTitle}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Town Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Town</label>
            <Select value={selectedTownId} onValueChange={setSelectedTownId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your town..." />
              </SelectTrigger>
              <SelectContent>
                {towns.map((town) => (
                  <SelectItem key={town.id} value={town.id}>
                    {town.name} ({town.infrastructures.length} centers)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Infrastructure Selection */}
          {selectedTown && selectedTown.infrastructures.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Select Learning Center</label>
              <div className="space-y-3">
                {selectedTown.infrastructures.map((infra) => {
                  const isFull = infra.currentEnrollment >= infra.capacity;
                  const isDeadlinePassed = infra.enrollmentDeadline && new Date() > new Date(infra.enrollmentDeadline);
                  const isLocked = isFull || isDeadlinePassed;

                  return (
                    <Card
                      key={infra.id}
                      className={`cursor-pointer transition-all ${
                        selectedInfraId === infra.id ? "border-blue-500 bg-blue-50" : ""
                      } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                      onClick={() => !isLocked && setSelectedInfraId(infra.id)}
                    >
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{infra.name}</h3>
                              <p className="text-sm text-gray-600">{infra.location}</p>
                            </div>
                            {isLocked && (
                              <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium">
                                <AlertCircle className="w-3 h-3" />
                                {isFull ? "FULL" : "CLOSED"}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Users className="w-4 h-4" />
                              <span>{infra.currentEnrollment}/{infra.capacity} spots</span>
                            </div>
                            {infra.openTime && infra.closeTime && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4" />
                                <span>{infra.openTime} - {infra.closeTime}</span>
                              </div>
                            )}
                          </div>

                          {infra.tutorNames && infra.tutorNames.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-gray-700 mb-1">Instructors:</p>
                              <p className="text-sm text-gray-600">{infra.tutorNames.join(", ")}</p>
                            </div>
                          )}

                          <div className="pt-2">
                            <Button
                              type="button"
                              variant={selectedInfraId === infra.id ? "default" : "outline"}
                              size="sm"
                              disabled={isLocked || false}
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isLocked) {
                                  setSelectedInfraId(infra.id);
                                }
                              }}
                            >
                              {selectedInfraId === infra.id ? "✓ Selected" : "Select"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {selectedInfra && !selectedTown?.infrastructures.some(i => i.id === selectedInfraId && (i.currentEnrollment >= i.capacity)) && (
            <Button
              onClick={() => setShowConfirm(true)}
              className="w-full"
              disabled={!selectedInfraId}
            >
              Continue to Payment
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Your Enrollment</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3 pt-4">
            <div className="space-y-2">
              <div className="font-medium">You are enrolling in:</div>
              <div className="bg-blue-50 p-3 rounded space-y-1 border-l-4 border-blue-400">
                <div className="font-semibold">{selectedTown?.name} - {selectedInfra?.name}</div>
                <div className="text-sm text-gray-700">📍 {selectedInfra?.location}</div>
              </div>
            </div>
            
            <div className="bg-orange-50 p-3 rounded border-l-4 border-orange-400 space-y-2">
              <div className="font-semibold text-orange-900">⚠️ Important Terms:</div>
              <ul className="text-sm text-orange-800 space-y-1 list-disc list-inside">
                <li><strong>Non-Refundable:</strong> Payments cannot be refunded once confirmed</li>
                <li><strong>Location Locked:</strong> You cannot change learning centers after enrollment</li>
                <li><strong>Monthly Subscription:</strong> Recurring payment required each month</li>
                <li><strong>Non-Payment Consequence:</strong> Ejection from course after 30 days overdue</li>
              </ul>
            </div>

            <div className="text-sm text-gray-600">
              By confirming, you agree to these terms. If you have questions, contact support@a-share.dev
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEnrollment}
              disabled={isLoading || !selectedInfraId}
              className="bg-green-600 hover:bg-green-700"
            >
              {isLoading ? "Processing..." : "I Understand & Confirm"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
