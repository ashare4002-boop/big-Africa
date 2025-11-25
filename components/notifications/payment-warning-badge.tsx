"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  daysRemaining?: number;
  amountDue?: number;
  enrollmentId?: string;
  read: boolean;
}

export function PaymentWarningNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/get");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications.filter((n: Notification) => !n.read));
      } else if (response.status !== 401) {
        // 401 is expected for unauthenticated users, don't notify
        toast.error("Failed to load notifications");
      }
    } catch (error) {
      // Network errors are expected, silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    try {
      await fetch("/api/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (error) {
      toast.error("Failed to dismiss notification");
    }
  };

  if (loading || notifications.length === 0) return null;

  return (
    <div className="space-y-3">
      {notifications.map(notification => (
        <Card key={notification.id} className="bg-blue-50 border-blue-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-blue-900">{notification.title}</p>
              <p className="text-sm text-blue-800 mt-1">{notification.message}</p>
              {notification.enrollmentId && (
                <div className="flex gap-2 mt-3">
                  <Button
                    asChild
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <a href={`/enrollment/${notification.enrollmentId}/pay`}>
                      Pay Now
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(notification.id)}
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
