"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export default function VerifyRequest() {
    const router = useRouter();
    const [otp, setOtp] = useState("");
    const [emailPending, startTransition] = useTransition();
    const params = useSearchParams(); 
    const email = params.get("email") as string;
    const isOtpCompleted = otp.length === 6;
 
    function verifyOtp(){
      startTransition ( async () => {
        await authClient.signIn.emailOtp({
          email: email,
          otp: otp,
          fetchOptions: {
            onSuccess: async () => {
                toast.success("Email verified! Starting your 7-day free trial...");
                // Initialize trial for new user
                try {
                  await fetch("/api/auth/init-trial", { method: "POST" });
                } catch (error) {
                  console.error("Trial initialization failed silently, continuing...");
                }
                router.push("/");
            },
            onError: () => {
              if (!navigator.onLine) {
                toast.error("No internet connection. Please check your connection and try again.");
              } else {
                toast.error("Invalid or expired verification code. Please request a new code and try again.");
              }
            }
          }
        })
      })
    }
    return( 
        <Card className="w-full mx-auto">
            <CardHeader className="text-center">
                <CardTitle className="text-xl">Please verify your email</CardTitle>
                <CardDescription>We have a sent verification code to your email address. Please open your email and paste the code below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex flex-col items-center space-y-2">
                    <InputOTP value ={otp} onChange={(value) => setOtp(value)} maxLength={6} className="gap-2">
                    <InputOTPGroup>
                     <InputOTPSlot index={0}/>
                     <InputOTPSlot index={1}/>
                     <InputOTPSlot index={2}/>
                    </InputOTPGroup>
                    <InputOTPGroup>
                     <InputOTPSlot index={3}/>
                     <InputOTPSlot index={4}/>
                     <InputOTPSlot index={5}/>
                    </InputOTPGroup>
                    </InputOTP>
                    <p className="text-sm text-muted-foreground"> Enter the 6-digit code send to your email</p>
                </div>
                 <Button onClick={verifyOtp} disabled ={emailPending || !isOtpCompleted } className="w-full">{emailPending ? (
                    <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Loading...</span>
                    </>
                 ): (
                    " Verify Email"
                 )
                 
                 }</Button>
            </CardContent>
        </Card>
    )
}