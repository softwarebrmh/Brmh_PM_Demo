// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'staff';
export type StaffStatus = 'invited' | 'active' | 'suspended';
export type ProjectStatus = 'active' | 'archived';
export type SprintStatus = 'draft' | 'active' | 'completed';
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

// ─── Shared ───────────────────────────────────────────────────────────────────

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

export interface PaginatedMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: PaginatedMeta;
}

export interface SingleResponse<T> {
  success: true;
  data: T;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  sub: string;
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: UserRole;
  companyId?: string | null;
  isEmailVerified: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  workingHoursStart: string;
  workingHoursEnd: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Staff ────────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string;
  email: string;
  designation?: string | null;
  user?: UserSummary | null;
  companyId: string;
  status: StaffStatus;
  joinedAt?: string | null;
  lastActiveAt?: string | null;
  createdAt: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  companyId: string;
  createdBy: UserSummary;
  sprintCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Sprint ───────────────────────────────────────────────────────────────────

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  taskCount: number;
  createdAt: string;
}

// ─── Task ─────────────────────────────────────────────────────────────────────

export interface StepProgress {
  total: number;
  completed: number;
  percentage: number;
}

export interface Task {
  id: string;
  sprintId: string;
  parentTaskId?: string | null;
  name: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string | null;
  plannedDueDate?: string | null;
  actualDueDate?: string | null;
  plannedEffortPh: number;
  estimatedEffortPh: number;
  actualEffortPh: number;
  slippagePh: number;
  stepProgress: StepProgress;
  owner?: UserSummary | null;
  assignees: UserSummary[];
  subTaskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends Task {
  sprint: {
    id: string;
    projectId: string;
    name: string;
    goal?: string | null;
    status: SprintStatus;
    startDate?: string | null;
    endDate?: string | null;
    taskCount: number;
  } | null;
  steps: TaskStep[];
  recentComments: CommentItem[];
  recentAttachments: AttachmentItem[];
}

// ─── Step ─────────────────────────────────────────────────────────────────────

export interface TaskStep {
  id: string;
  taskId: string;
  title: string;
  isChecked: boolean;
  order: number;
  checkedAt?: string | null;
  checkedBy?: UserSummary | null;
  createdAt: string;
}

// ─── Attachment ───────────────────────────────────────────────────────────────

export interface AttachmentItem {
  id: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploader: UserSummary;
  downloadUrl: string;
  createdAt: string;
}

// ─── Note ─────────────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  taskId: string;
  title?: string | null;
  content: string;
  author: UserSummary;
  createdAt: string;
  updatedAt: string;
}

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface CommentReply {
  id: string;
  content: string;
  author: UserSummary | null;
  createdAt: string;
}

export interface CommentReaction {
  id: string;
  emoji: string;
  user: UserSummary;
}

export interface CommentItem {
  id: string;
  taskId: string;
  content: string;
  author: UserSummary | null;
  mentions: Array<{ userId: string; fullName: string; email: string }>;
  replies: CommentReply[];
  reactions: CommentReaction[];
  createdAt: string;
  updatedAt: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface TaskStatusBreakdown {
  todo: number;
  inProgress: number;
  review: number;
  done: number;
  overdue?: number;
  total?: number;
}

export interface AdminDashboard {
  staff: { total: number; active: number; pending: number };
  projects: { total: number; active: number };
  sprints: { active: number };
  tasks: TaskStatusBreakdown;
  recentActivity: ActivityItem[];
}

export interface DashboardSprint {
  id: string;
  name: string;
  goal?: string | null;
  status: SprintStatus;
  startDate?: string | null;
  endDate?: string | null;
  taskCount: number;
  project?: { id: string; name: string } | null;
}

export interface DashboardTask {
  id: string;
  name: string;
  status: TaskStatus;
  priority: TaskPriority;
  plannedDueDate?: string | null;
  sprint?: { id: string; name: string; projectId: string } | null;
}

export interface StaffDashboard {
  myTasks: TaskStatusBreakdown;
  upcomingTasks: DashboardTask[];
  activeSprints: DashboardSprint[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actor?: UserSummary;
  createdAt: string;
}
