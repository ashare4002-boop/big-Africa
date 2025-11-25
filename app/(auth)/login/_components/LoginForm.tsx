"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";
import { useState, useTransition } from "react";
import { Loader, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router= useRouter()
  const [googlePending, startGoogleTransition] = useTransition();
  const [emailPending, startEmailTransition] = useTransition();
  const [email, setEmail] = useState("");

  async function signInWithGoogle() {
    startGoogleTransition(async () => {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed in successfully! Redirecting...");
          },
          onError: (error) => {
            if (!navigator.onLine) {
              toast.error("No internet connection. Please check your connection and try again.");
            } else {
              toast.error("Failed to sign in with Google. Please try again or use email login.");
            }
          },
        },
      });
    });
  }

  function SignInWithEmail() {
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    startEmailTransition(async () => {
      await authClient.emailOtp.sendVerificationOtp({
        email: email,
        type:"sign-in",
        fetchOptions: {
          onSuccess: () => {
            toast.success('Verification code sent! Check your email.');
            router.push(`/verify-request?email=${email}`);
          },
          onError:() => {
            if (!navigator.onLine) {
              toast.error("No internet connection. Please check your connection and try again.");
            } else {
              toast.error("Failed to send verification code. Please check your email address and try again.");
            }
          }
        }
      })
    })
   }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Log in with your Google Email account</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-4 ">
        <Button
          disabled={googlePending}
          onClick={signInWithGoogle}
          className="w-full"
          variant="outline"
        >
          {googlePending ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Loading...</span>
            </>
          ) : (
            <>
              <FcGoogle className="h-4 w-4" />
              Log in with Google
            </>
          )}
        </Button>

  <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
          <span className="relative z-10 bg-card px-2 text-muted-foreground">
            Or continue with{" "}
          </span>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input  value = {email} onChange ={(e) => setEmail(e.target.value)} type="email" placeholder="m@example.com"  required/>
          </div>
          <Button onClick={SignInWithEmail} disabled = {emailPending}>{emailPending ? (
            <>
            <Loader2 className= "h-4 w-4 animate-spin" />
            <span>Loading...</span>
            </>
          ): (
            <>
            <Send className="h-4 w-4"/>
            <span>Continue</span>
            </>
          )}</Button>
        </div>
      </CardContent>
    </Card>
  );
} 
 