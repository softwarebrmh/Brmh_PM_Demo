# BRMH Teams — Enterprise Task-Centric Execution Platform

A full-stack, enterprise-grade project management platform built with **NestJS** + **Prisma** on the backend and **Next.js 14** on the frontend. It covers the full employee lifecycle — from company onboarding and staff invitations through sprint planning, task execution, file attachments, versioned notes, threaded comments, and a complete audit trail.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Project Structure](#project-structure)
4. [Local Development Setup](#local-development-setup)
5. [Environment Variables](#environment-variables)
6. [Database Schema](#database-schema)
7. [API Reference](#api-reference)
8. [Frontend Pages & Routes](#frontend-pages--routes)
9. [Authentication & Authorization](#authentication--authorization)
10. [npm Scripts](#npm-scripts)
11. [Default Credentials](#default-credentials-after-seed)
12. [Architecture & Data Flow](#architecture--data-flow)
13. [Deployment](#deployment-mvp)

---

## Tech Stack

### Backend

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS 10 |
| ORM | Prisma 5 |
| Database | PostgreSQL 15+ |
| Auth | JWT (Passport.js) + bcrypt |
| Validation | class-validator + class-transformer |
| API Docs | Swagger / OpenAPI 3 (`@nestjs/swagger`) |
| File Uploads | Multer (local disk storage) |
| Email | Nodemailer (SMTP) |

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| State Management | Zustand 4 |
| Server State | TanStack Query (React Query) v5 |
| HTTP Client | Axios |
| Forms | React Hook Form + Zod |
| UI Primitives | Radix UI (Dialog, DropdownMenu, Select, Tabs, Avatar, Popover, Tooltip) |
| Icons | Lucide React |
| Notifications | react-hot-toast |
| API Client | Generated via `@hey-api/openapi-ts` |

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| PostgreSQL | 15+ (local installation) |

---

## Project Structure

```
BRMH Teams/
├── backend/                        # NestJS REST API
│   ├── prisma/
│   │   ├── schema.prisma           # Single source of truth for DB schema
│   │   ├── migrations/             # Prisma migration history
│   │   └── seed.ts                 # Demo data: admin, staff, company, project, sprint, task
│   ├── src/
│   │   ├── main.ts                 # Bootstrap: CORS, global pipes, Swagger, prefix
│   │   ├── app.module.ts           # Root module wiring all feature modules
│   │   ├── common/
│   │   │   ├── constants/          # App-wide constants
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   │   │   ├── public.decorator.ts         # @Public() — skip JWT guard
│   │   │   │   └── roles.decorator.ts          # @Roles(Role.admin)
│   │   │   ├── enums/
│   │   │   │   ├── role.enum.ts                # admin | staff
│   │   │   │   └── task-status.enum.ts         # todo → in_progress → review → done
│   │   │   ├── filters/
│   │   │   │   └── global-exception.filter.ts  # Unified JSON error responses
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts           # Global JWT guard (allows @Public)
│   │   │   │   ├── roles.guard.ts              # Role-based access guard
│   │   │   │   ├── task-access.guard.ts        # Verifies task belongs to user's company
│   │   │   │   └── company-owner.guard.ts      # Restricts to company owner only
│   │   │   ├── interfaces/
│   │   │   │   └── jwt-payload.interface.ts    # { sub, email, role, companyId }
│   │   │   └── utils/
│   │   │       ├── pagination.util.ts
│   │   │       ├── slippage.util.ts            # Sprint slippage calculation
│   │   │       ├── slug.util.ts                # Company slug generation
│   │   │       └── token.util.ts               # Crypto token helpers
│   │   ├── config/
│   │   │   ├── app.config.ts                   # PORT, NODE_ENV, FRONTEND_URL
│   │   │   ├── database.config.ts              # DATABASE_URL
│   │   │   └── jwt.config.ts                   # JWT_SECRET, JWT_EXPIRES_IN
│   │   ├── prisma/
│   │   │   ├── prisma.module.ts                # Global PrismaModule
│   │   │   └── prisma.service.ts               # PrismaClient singleton
│   │   └── modules/
│   │       ├── auth/               # Signup, login, invite acceptance, forgot/reset password, /me
│   │       ├── users/              # Profile update, password change
│   │       ├── company/            # Company CRUD, settings
│   │       ├── staff/              # Invite staff, list, suspend, activate
│   │       ├── projects/           # Project CRUD, archive, member management
│   │       ├── sprints/            # Sprint lifecycle: draft → active → review → completed
│   │       ├── tasks/              # Full task lifecycle + sub-tasks + assignment
│   │       ├── steps/              # Checklist steps: create, check/uncheck, delete
│   │       ├── attachments/        # File upload (multer) + streaming download
│   │       ├── notes/              # Task notes with full version history
│   │       ├── comments/           # Threaded comments + replies + emoji reactions
│   │       ├── dashboard/          # Admin & staff dashboard aggregates
│   │       ├── audit/              # Audit trail query endpoint
│   │       └── health/             # GET /health — public, no JWT
│   ├── uploads/                    # Local file storage (gitignored)
│   ├── .env.example
│   └── package.json
│
├── frontend/                       # Next.js 14 App Router
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/             # Public auth route group
│   │   │   │   ├── login/
│   │   │   │   ├── forgot-password/
│   │   │   │   ├── reset-password/
│   │   │   │   └── accept-invite/
│   │   │   └── (dashboard)/        # Protected dashboard route group
│   │   │       ├── dashboard/
│   │   │       ├── projects/
│   │   │       ├── tasks/
│   │   │       ├── my-tasks/
│   │   │       ├── staff/
│   │   │       ├── settings/
│   │   │       └── notifications/
│   │   ├── components/
│   │   │   ├── auth/               # LoginForm, ForgotPasswordForm, etc.
│   │   │   ├── common/             # Shared components (loaders, badges, etc.)
│   │   │   ├── layout/             # Sidebar, TopNav, AppShell
│   │   │   ├── sprints/            # SprintCard, SprintBoard, etc.
│   │   │   ├── tasks/              # TaskCard, TaskModal, TaskDetail, etc.
│   │   │   └── ui/                 # Base UI primitives (Button, Input, Modal)
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   ├── client.ts       # Axios instance with auth interceptors
│   │   │   │   └── index.ts        # All typed API call functions
│   │   │   ├── hooks/              # Custom React hooks (useAuth, useTasks, etc.)
│   │   │   ├── stores/             # Zustand stores (auth, UI state)
│   │   │   └── utils/              # Date helpers, formatters, cn()
│   │   ├── providers/              # QueryClientProvider, AuthProvider
│   │   └── types/                  # Global type declarations
│   ├── openapi-ts.config.ts        # API client generator config
│   ├── tailwind.config.ts
│   └── package.json
│
├── openapi/                        # Generated OpenAPI spec (JSON/YAML)
├── EMPLOYEE_IMPLEMENTATION_SPEC.md # Detailed business & implementation spec
├── TASK_EXPERIENCE_DESIGN.md       # UX design spec for task flows
└── README.md

```

---

## Local Development Setup

### 1. Create the database

Open `psql` and run:

```sql
CREATE DATABASE bhrm_teams;
```

### 2. Configure backend environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your values (see [Environment Variables](#environment-variables) below).

### 3. Install dependencies

```bash
# Backend
cd backend
npm install --legacy-peer-deps

# Frontend
cd ../frontend
npm install
```

### 4. Run migrations & seed

```bash
cd backend

# First time — creates all tables AND seeds demo data
npm run db:setup

# Or run separately:
npx prisma migrate dev --name init
npm run prisma:seed
```

### 5. Start the development servers

```bash
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3001)
cd frontend
npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3001 |
| REST API | http://localhost:3000/api/v1 |
| Swagger UI | http://localhost:3000/api/docs |
| Health Check | http://localhost:3000/api/v1/health |
| Prisma Studio | http://localhost:5555 (run `npm run prisma:studio`) |

---

## Environment Variables

### `backend/.env`

```env
# ── Application ──────────────────────────
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3001

# ── Database ──────────────────────────────
DATABASE_URL="postgresql://postgres:password@localhost:5432/bhrm_teams"

# ── JWT ───────────────────────────────────
JWT_SECRET=replace-with-a-long-random-secret-minimum-32-chars
JWT_EXPIRES_IN=7d

# ── File Uploads ──────────────────────────
UPLOAD_DIR=uploads

# ── Email (SMTP) ──────────────────────────
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=
SMTP_PASS=
SMTP_FROM="BRMH Teams <noreply@brmh.local>"
```

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

---

## Database Schema

The Prisma schema defines **16 models** across 3 domains.

### Core Entities

| Model | Table | Description |
|---|---|---|
| `User` | `users` | Platform users (admin or staff). Supports soft-delete, avatar, password-reset token. |
| `Company` | `companies` | Tenant / organisation. Owns projects, staff, and audit trails. Has timezone & working hours. |
| `CompanyStaff` | `company_staff` | Junction between a company and a user. Tracks invite lifecycle (`invited → active → suspended`). |

### Project & Sprint

| Model | Table | Description |
|---|---|---|
| `Project` | `projects` | Belongs to a company. Has members (`ProjectMember`). Status: `active \| archived`. |
| `Sprint` | `sprints` | Belongs to a project. Lifecycle: `draft → active → review → completed`. Has a goal, start/end dates, and members. |
| `ProjectMember` | `project_members` | Who has access to a project. |
| `SprintMember` | `sprint_members` | Who is included in a sprint. |

### Task Domain

| Model | Table | Description |
|---|---|---|
| `Task` | `tasks` | Core entity. Belongs to a sprint. Supports sub-tasks (self-relation). Priority: `low \| medium \| high \| critical`. Tracks planned, estimated, and actual effort (person-hours). |
| `TaskAssignee` | `task_assignees` | Multi-assignee support per task with assignment audit. |
| `TaskStep` | `task_steps` | Ordered checklist items with check/uncheck tracking. |

### Collaboration

| Model | Table | Description |
|---|---|---|
| `Attachment` | `attachments` | Files uploaded to tasks. Stores `filePath`, `mimeType`, `fileSize`. |
| `Note` | `notes` | Rich-text notes on tasks with versioning. |
| `NoteVersion` | `note_versions` | Immutable history of every note edit. |
| `Comment` | `comments` | Top-level comments on tasks. Supports metadata JSON. |
| `CommentReply` | `comment_replies` | Threaded replies to comments. |
| `CommentReaction` | `comment_reactions` | Emoji reactions on comments (unique per user + emoji + comment). |

### Observability

| Model | Table | Description |
|---|---|---|
| `AuditTrail` | `audit_trails` | Append-only log of 30+ actions across all entities. Stores `before`/`after` JSON snapshots. |

### Enums

| Enum | Values |
|---|---|
| `UserRole` | `admin`, `staff` |
| `StaffStatus` | `invited`, `active`, `suspended` |
| `ProjectStatus` | `active`, `archived` |
| `SprintStatus` | `draft`, `active`, `review`, `completed` |
| `TaskStatus` | `todo`, `in_progress`, `review`, `done` |
| `TaskPriority` | `low`, `medium`, `high`, `critical` |

---

## API Reference

All endpoints are prefixed with `/api/v1`. Full interactive docs at **http://localhost:3000/api/docs**.

### Auth — `/api/v1/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | Public | Create account + company |
| POST | `/auth/login` | Public | Login, returns JWT |
| POST | `/auth/accept-invite` | Public | Staff accept invite & set password |
| POST | `/auth/forgot-password` | Public | Send password-reset email |
| POST | `/auth/reset-password` | Public | Reset password with token |
| GET | `/auth/me` | JWT | Get current user profile |

### Users — `/api/v1/users`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/users/profile` | JWT | Get own profile |
| PATCH | `/users/profile` | JWT | Update name / avatar |
| PATCH | `/users/password` | JWT | Change password |

### Company — `/api/v1/company`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/company` | JWT (admin) | Create company |
| GET | `/company` | JWT | Get own company |
| PATCH | `/company` | JWT (admin) | Update company settings |

### Staff — `/api/v1/staff`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/staff/invite` | JWT (admin) | Invite staff by email |
| GET | `/staff` | JWT (admin) | List all staff |
| GET | `/staff/:id` | JWT (admin) | Get staff member detail |
| PATCH | `/staff/:id/suspend` | JWT (admin) | Suspend a staff member |
| PATCH | `/staff/:id/activate` | JWT (admin) | Re-activate a staff member |

### Projects — `/api/v1/projects`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/projects` | JWT (admin) | Create project |
| GET | `/projects` | JWT | List all projects |
| GET | `/projects/:id` | JWT | Get project details |
| PATCH | `/projects/:id` | JWT (admin) | Update project |
| PATCH | `/projects/:id/archive` | JWT (admin) | Archive project |
| POST | `/projects/:id/members` | JWT (admin) | Add project member |
| DELETE | `/projects/:id/members/:userId` | JWT (admin) | Remove project member |

### Sprints — `/api/v1/sprints`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/sprints` | JWT (admin) | Create sprint (draft) |
| GET | `/sprints` | JWT | List sprints (filter by project) |
| GET | `/sprints/:id` | JWT | Get sprint details |
| PATCH | `/sprints/:id` | JWT (admin) | Update sprint |
| PATCH | `/sprints/:id/start` | JWT (admin) | Transition: draft → active |
| PATCH | `/sprints/:id/end` | JWT (admin) | Transition: active → completed |

### Tasks — `/api/v1/tasks`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tasks` | JWT | Create task |
| GET | `/tasks` | JWT | List tasks (filter by sprint, assignee, status, priority) |
| GET | `/tasks/:id` | JWT | Get full task detail (with sub-tasks, steps, assignees) |
| PATCH | `/tasks/:id` | JWT | Update task fields |
| PATCH | `/tasks/:id/status` | JWT | Change task status |
| PATCH | `/tasks/:id/priority` | JWT | Change task priority |
| POST | `/tasks/:id/assign` | JWT | Assign user to task |
| DELETE | `/tasks/:id/assign/:userId` | JWT | Unassign user from task |
| DELETE | `/tasks/:id` | JWT (admin) | Soft-delete task |

### Steps — `/api/v1/tasks/:taskId/steps`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tasks/:taskId/steps` | JWT | Add checklist step |
| GET | `/tasks/:taskId/steps` | JWT | List steps |
| PATCH | `/tasks/:taskId/steps/:id/check` | JWT | Mark step as done |
| PATCH | `/tasks/:taskId/steps/:id/uncheck` | JWT | Unmark step |
| DELETE | `/tasks/:taskId/steps/:id` | JWT | Delete step |

### Attachments — `/api/v1/tasks/:taskId/attachments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tasks/:taskId/attachments` | JWT | Upload file (multipart/form-data) |
| GET | `/tasks/:taskId/attachments` | JWT | List attachments |
| GET | `/tasks/:taskId/attachments/:id/download` | JWT | Stream file download |
| DELETE | `/tasks/:taskId/attachments/:id` | JWT | Soft-delete attachment |

### Notes — `/api/v1/tasks/:taskId/notes`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tasks/:taskId/notes` | JWT | Create note |
| GET | `/tasks/:taskId/notes` | JWT | List notes |
| GET | `/tasks/:taskId/notes/:id` | JWT | Get note with version history |
| PATCH | `/tasks/:taskId/notes/:id` | JWT | Update note (creates new version) |
| DELETE | `/tasks/:taskId/notes/:id` | JWT | Soft-delete note |

### Comments — `/api/v1/tasks/:taskId/comments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/tasks/:taskId/comments` | JWT | Add comment |
| GET | `/tasks/:taskId/comments` | JWT | List comments with replies & reactions |
| PATCH | `/tasks/:taskId/comments/:id` | JWT | Edit comment |
| DELETE | `/tasks/:taskId/comments/:id` | JWT | Soft-delete comment |
| POST | `/tasks/:taskId/comments/:id/replies` | JWT | Add reply to comment |
| POST | `/tasks/:taskId/comments/:id/reactions` | JWT | Add emoji reaction |
| DELETE | `/tasks/:taskId/comments/:id/reactions/:emoji` | JWT | Remove emoji reaction |

### Dashboard — `/api/v1/dashboard`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/dashboard/admin` | JWT (admin) | Company-wide KPIs, sprint progress, slippage |
| GET | `/dashboard/staff` | JWT (staff) | Personal task summary, upcoming deadlines |

### Audit — `/api/v1/audit`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/audit` | JWT (admin) | Query audit trail (filter by entity, action, actor, date range) |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Service health check |

---

## Frontend Pages & Routes

| Route | Access | Description |
|---|---|---|
| `/login` | Public | Email + password login |
| `/forgot-password` | Public | Request password-reset email |
| `/reset-password` | Public | Set new password via token |
| `/accept-invite` | Public | Staff onboarding flow |
| `/dashboard` | Auth | Overview: KPIs, active sprints, recent activity |
| `/projects` | Auth | Project list + create |
| `/projects/[id]` | Auth | Project detail, sprints, members |
| `/tasks` | Auth | All tasks with filters |
| `/tasks/[id]` | Auth | Full task view: steps, notes, comments, attachments |
| `/my-tasks` | Auth | Personal task board for the logged-in user |
| `/staff` | Admin only | Invite, suspend, and activate staff members |
| `/settings` | Auth | Company & profile settings |
| `/notifications` | Auth | Notification centre |

---

## Authentication & Authorization

The platform uses a **JWT Bearer token** strategy via `@nestjs/passport`.

### Auth Flow

1. User calls `POST /auth/login` → receives a signed JWT (7 days by default).
2. Frontend stores the token (Zustand + localStorage) and attaches it as `Authorization: Bearer <token>` via an Axios interceptor.
3. A global `JwtAuthGuard` validates every request. Routes decorated with `@Public()` skip this guard.

### Role-Based Access Control (RBAC)

- **`admin`** — Company owner. Full access to all company resources including staff management, project archive, and admin dashboard.
- **`staff`** — Regular employee. Scoped to assigned projects/tasks. Can manage own tasks, comments, notes, and attachments.

### Guards

| Guard | Purpose |
|---|---|
| `JwtAuthGuard` | Validates JWT on every request |
| `RolesGuard` | Enforces `@Roles(Role.admin)` decorator |
| `TaskAccessGuard` | Ensures the task belongs to the user's company |
| `CompanyOwnerGuard` | Restricts endpoint to the company owner only |

### JWT Payload

```typescript
interface JwtPayload {
  sub: string;       // User UUID
  email: string;
  role: 'admin' | 'staff';
  companyId: string;
}
```

---

## npm Scripts

### Backend (`cd backend`)

| Command | Description |
|---|---|
| `npm run dev` | Dev server with hot-reload (kills existing process on port 3000) |
| `npm run start:dev` | Alias for `dev` |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run db:setup` | Run migrations + seed in one command |
| `npx prisma migrate dev --name <name>` | Create and apply a new migration |
| `npx prisma generate` | Regenerate Prisma Client after schema changes |
| `npm run prisma:studio` | Open Prisma Studio at http://localhost:5555 |
| `npm run prisma:seed` | Seed demo admin + company + staff + project + sprint + task |
| `npm run prisma:reset` | Wipe DB and re-migrate (dev only — destructive!) |
| `npm run lint` | ESLint with auto-fix |

### Frontend (`cd frontend`)

| Command | Description |
|---|---|
| `npm run dev` | Dev server on port 3001 |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run generate:api` | Regenerate typed API client from OpenAPI spec |

---

## Default Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.com | Admin1234! |
| Staff | staff@demo.com | Staff1234! |

The seed also creates:
- **Company**: "Demo Company"
- **Project**: "Demo Project"
- **Sprint**: An active sprint
- **Task**: One task assigned to the staff user

---

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────┐
│                   Next.js 14                    │
│  App Router · TanStack Query · Zustand · Axios  │
└────────────────────┬────────────────────────────┘
                     │ HTTP / REST (JWT Bearer)
┌────────────────────▼────────────────────────────┐
│                  NestJS API                     │
│  Global JWT Guard → Module Controllers          │
│       → Services → Prisma ORM                  │
└────────────────────┬────────────────────────────┘
                     │ Prisma Client
┌────────────────────▼────────────────────────────┐
│               PostgreSQL 15+                    │
│  16 models · soft-delete · audit trail         │
└─────────────────────────────────────────────────┘
```

### Request Lifecycle (Backend)

```
HTTP Request
    → GlobalExceptionFilter (catch-all error handler)
    → JwtAuthGuard (validate token; skip if @Public)
    → RolesGuard (check @Roles if present)
    → Controller (route handler + DTO validation)
    → Service (business logic)
    → PrismaService (database query)
    → JSON Response
```

### State Machines

**Sprint**
```
draft ──[start]──► active ──[end]──► completed
                     │
                   [review]  (optional review stage)
```

**Task**
```
todo ──► in_progress ──► review ──► done
```

---

## Deployment (MVP)

| Layer | Provider |
|---|---|
| Frontend | Vercel |
| Backend | Railway / Render / DigitalOcean VPS |
| Database | Neon / Supabase / Railway PostgreSQL |
| File Storage | Local `uploads/` → migrate to S3 / Cloudflare R2 for production |

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `DATABASE_URL` to the hosted PostgreSQL connection string
- [ ] Set a strong, unique `JWT_SECRET` (minimum 32 characters)
- [ ] Configure `SMTP_*` variables for real email delivery
- [ ] Set `FRONTEND_URL` to the deployed Vercel domain (for CORS)
- [ ] Set `NEXT_PUBLIC_API_URL` in Vercel env vars to the backend URL
- [ ] Run `npx prisma migrate deploy` (not `dev`) in CI/CD
- [ ] Ensure `uploads/` directory is on a persistent volume (or swap to object storage)

