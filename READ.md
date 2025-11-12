# A-Share Learning Platform

## Overview

A-Share is a Next.js-based learning management system (LMS) designed to democratize education in Cameroon. The platform enables creation and management of educational courses, particularly targeting Cameroonian educational certifications (BAC, GCE, Probatoire, Concours). Built with Next.js 15, the application features a comprehensive admin dashboard for course management, modular lesson content blocks, authentication via Better Auth, and cloud-based file storage using AWS S3/Tigris.

## Recent Changes

### November 2, 2025 - Modular Lesson Editor System

Implemented a dynamic, block-based lesson editor similar to Frappe LMS, allowing instructors to create flexible lesson content:

**Key Features:**

- Modular content blocks supporting 5 types: Text/Rich Text, Images, Videos, Quizzes, Files
- Drag-and-drop reordering using @dnd-kit
- Add, edit, delete individual blocks within lessons
- Extensible architecture for future block types

**Technical Implementation:**

- New `LessonBlock` model with `LessonBlockType` enum in Prisma schema
- Type-safe block data schemas using Zod
- Server actions for CRUD operations with admin-only access
- Individual editor components for each block type
- Renderer components for lesson viewing
- JSON storage for flexible block-specific data

**Database Schema:**

- LessonBlock table with foreign key to Lesson (cascade delete)
- Position-based ordering system
- JSONB data field for extensibility

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: Next.js 15 (App Router)

- **Rationale**: Leverages React Server Components for optimal performance and SEO
- **Routing**: App Router with route groups for public, auth, and admin sections
- **Pros**: Built-in server-side rendering, optimized image handling, automatic code splitting
- **Cons**: Steeper learning curve compared to Pages Router

**UI Component Library**: shadcn/ui + Radix UI

- **Rationale**: Provides accessible, customizable components following modern design patterns
- **Theme System**: Custom CSS variables with dark/light mode support via next-themes
- **Styling**: TailwindCSS v4 with custom design tokens
- **Pros**: Highly customizable, accessible out-of-the-box, type-safe
- **Cons**: Manual component installation required

**Form Handling**: React Hook Form + Zod

- **Rationale**: Type-safe form validation with minimal re-renders
- **Validation**: Zod schemas for course creation, file uploads, and user input
- **Pros**: Excellent TypeScript integration, performance optimization
- **Cons**: Requires schema definitions for all forms

**Rich Text Editor**: TipTap

- **Rationale**: Provides extensible rich text editing for course descriptions
- **Extensions**: StarterKit, TextAlign for formatting options
- **Pros**: Highly customizable, framework-agnostic core
- **Cons**: Requires careful SSR handling (immediatelyRender: false)

**File Upload**: react-dropzone + Custom S3 Integration

- **Rationale**: Presigned URL strategy for secure direct-to-S3 uploads
- **Features**: Drag-and-drop, progress tracking, client-side file validation
- **Pros**: Reduces server load, improves upload performance
- **Cons**: Requires additional AWS configuration

**State Management**: React Server Components + Client Components

- **Rationale**: Minimizes client-side JavaScript by default
- **Pattern**: Server Components fetch data, Client Components handle interactivity
- **Pros**: Reduced bundle size, improved initial load time
- **Cons**: Requires careful boundary management between server/client

### Backend Architecture

**Authentication**: Better Auth

- **Rationale**: Modern, type-safe authentication solution with built-in security features
- **Providers**: Google OAuth, Email OTP (via Resend)
- **Plugins**: emailOTP, admin role management
- **Session Management**: Cookie-based sessions with secure defaults
- **Pros**: TypeScript-first, extensible plugin system, built-in CSRF protection
- **Cons**: Relatively newer library compared to NextAuth

**Authorization**: Role-based Access Control (RBAC)

- **Implementation**: Admin role checking via `requireAdmin()` server-only function
- **Middleware**: Next.js middleware protects admin routes using Better Auth cookies
- **Pros**: Simple, effective for current use case
- **Cons**: Limited granularity for complex permission requirements

**Security**: Arcjet

- **Features**: Bot detection, rate limiting, shield protection
- **Implementation**: Applied to auth endpoints, file uploads, and course creation
- **Configuration**: Per-route protection with fingerprinting
- **Pros**: Comprehensive security layer, easy integration
- **Cons**: Additional service dependency

**API Routes**: Next.js Route Handlers

- **Authentication**: `/api/auth/[...all]` - Better Auth handler with Arcjet protection
- **File Operations**:
  - `/api/s3/upload` - Generates presigned URLs for uploads
  - `/api/s3/delete` - Handles file deletion from S3
- **Sound**: `/api/sound/[type]` - Serves notification sounds
- **Pattern**: Server actions for mutations, API routes for special cases

**Server Actions**:

- **Course Management**: Create, update, delete operations
- **Rationale**: Type-safe, progressive enhancement compatible
- **Pros**: No separate API layer needed, automatic serialization
- **Cons**: Limited to POST requests, requires careful error handling

### Data Storage

**Database**: PostgreSQL via Prisma ORM

- **Rationale**: Robust relational database with strong typing through Prisma
- **Schema Design**:
  - Users, Sessions, Accounts (Better Auth tables)
  - Courses → Chapters → Lessons (hierarchical structure)
  - Verification table for email OTP
- **Generated Client**: Custom output location (`lib/generated/prisma`)
- **Pros**: Type safety, migrations, great DX
- **Cons**: ORM overhead for complex queries

**File Storage**: AWS S3 (Tigris via Fly.io)

- **Rationale**: Scalable, cost-effective object storage
- **Configuration**: Regional endpoint, presigned URL strategy
- **Bucket**: Separate bucket for images (`NEXT_PUBLIC_S3_BUCKET_NAME_IMAGES`)
- **URL Construction**: Custom hook `useConstructUrl()` builds public URLs
- **Pros**: Unlimited scalability, CDN integration ready
- **Cons**: Additional service complexity, requires AWS SDK

**Data Fetching Pattern**:

- **Server-only Functions**: Tagged with `"server-only"` directive
- **Admin Functions**: `adminGetCourses()`, `adminGetCourse()`, `adminGetLesson()`
- **Type Inference**: TypeScript types inferred from Prisma queries
- **Pros**: Zero client-side data exposure, type-safe
- **Cons**: Requires careful server/client boundary management

### External Dependencies

**Email Service**: Resend

- **Purpose**: Transactional emails for OTP verification
- **Integration**: Better Auth plugin configuration
- **Sender**: Currently using `onboarding@resend.dev` (requires domain verification for production)

**Cloud Storage**: Tigris (S3-compatible via Fly.io)

- **Endpoint**: `https://big34.fly.storage.tigris.dev`
- **SDK**: AWS SDK v3 for S3 operations
- **Operations**: PutObject, DeleteObject via presigned URLs

**Security Service**: Arcjet

- **Features**: Bot detection, rate limiting, sensitive info detection, shield
- **Key Rules**:
  - Global shield protection
  - Per-route bot detection and rate limits
  - Fingerprinting via user IDs
- **Modes**: LIVE (blocking) vs DRY_RUN (logging)

**OAuth Provider**: Google

- **Configuration**: Client ID and secret via environment variables
- **Prompt**: `select_account` for better UX
- **Callback**: Redirects to homepage after successful auth

**Environment Configuration**: @t3-oss/env-nextjs

- **Rationale**: Type-safe environment variable validation
- **Schema**: Zod-based validation for server and client variables
- **Server Variables**: Database URL, API keys, AWS credentials
- **Client Variables**: S3 bucket name (prefixed with `NEXT_PUBLIC_`)

**UI Dependencies**:

- **Icons**: @tabler/icons-react, lucide-react (dual library approach)
- **Drag & Drop**: @dnd-kit for sortable tables/lists
- **Tables**: @tanstack/react-table for data grids
- **Notifications**: sonner with custom sound integration

**Development Tools**:

- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality enforcement
- **Prisma Studio**: Database management UI
- **Custom Hooks**: `useIsMobile()`, `useSignOut()`, `useConstructUrl()`, `tryCatch()`

 This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
