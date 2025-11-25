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
  read: boolean;
}

export function SubscriptionWarningNotification() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // OPTIMIZATION: Filter on backend, not client-side
      const response = await fetch("/api/notifications/get?type=SUBSCRIPTION_WARNING");
      if (response.ok) {
        const data = await response.json();
        // Backend already filters by type and read status
        setNotifications(data.notifications);
      }
    } catch (error) {
      // Silent fail for network errors
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
      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (error) {
      toast.error("Failed to dismiss notification");
    }
  };

  if (loading || notifications.length === 0) return null;

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <Card key={notification.id} className="bg-amber-50 border-amber-200 p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">{notification.title}</p>
              <p className="text-sm text-amber-800 mt-1">{notification.message}</p>
              <div className="flex gap-2 mt-3">
                <Button
                  asChild
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  <a href="/subscription/pay">Pay Now</a>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDismiss(notification.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
