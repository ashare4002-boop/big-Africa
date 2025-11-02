

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { env } from "./env";
import { emailOTP } from "better-auth/plugins";
import { resend } from "./resend";
import { admin } from "better-auth/plugins" 

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),

  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },

  plugins:[
    emailOTP({
       async sendVerificationOTP({email, otp}) { 
        await resend.emails.send({
            from: "A-share  <onboarding@resend.dev>", // With onboarding yoy can only send email to you. Verify your domain...to send to every user.
            to: [email],
            subject: "A-share Please verify your",
            html: `<p>Your verification code is <strong>${otp}</strong></p>`
        });
       },
    }),
    admin(),
  ]
});
