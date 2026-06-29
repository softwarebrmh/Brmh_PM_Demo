'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronRight, AlertCircle, Users, Check, X, UserPlus } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { TaskStatusBadge, PriorityBadge } from '@/components/ui/badge';
import { AvatarGroup } from '@/components/ui/avatar';
import { PageSpinner } from '@/components/ui/spinner';
import { MemberPicker } from '@/components/ui/member-picker';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSprint } from '@/lib/hooks/use-projects';
import { useSprintTasks, useCreateTask, taskKeys } from '@/lib/hooks/use-tasks';
import { tasksApi, sprintMembersApi, staffApi } from '@/lib/api';
import { formatDate, extractError } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { Task, TaskStatus, TaskPriority } from '@/types';

const schema = z.object({
  name:              z.string().min(1, 'Task name required'),
  description:       z.string().optional(),
  priority:          z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  plannedDueDate:    z.string().optional(),
  plannedEffortPh:   z.coerce.number().min(0).optional(),
  estimatedEffortPh: z.coerce.number().min(0).optional(),
});
type FormData = z.infer<typeof schema>;

const PRIORITY_ORDER: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STATUS_ORDER:   Record<TaskStatus,   number> = { in_progress: 0, review: 1, todo: 2, done: 3 };
const NEXT_STATUS: Partial<Record<TaskStatus, TaskStatus>> = {
  todo: 'in_progress', in_progress: 'review', review: 'done',
};

function TaskRow({ task, isAdmin, onStatusAdvance, projectId, sprintId }: {
  task: Task; isAdmin: boolean;
  onStatusAdvance: (id: string, s: TaskStatus) => void;
  projectId: string; sprintId: string;
}) {
  const isOverdue = task.plannedDueDate && task.status !== 'done' && new Date(task.plannedDueDate) < new Date();
  const next = NEXT_STATUS[task.status];

  return (
    <tr className="group border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
      <td className="px-4 py-3 min-w-0 max-w-xs">
        <Link href={`/tasks/${task.id}`} className="block min-w-0">
          <p className="truncate text-sm font-medium text-gray-900 hover:underline">{task.name}</p>
          {task.description && (
            <p className="mt-0.5 truncate text-xs text-gray-400">{task.description}</p>
          )}
        </Link>
        {task.stepProgress?.total > 0 && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-1 w-20 rounded-full bg-gray-100">
              <div
                className="h-1 rounded-full bg-gray-800"
                style={{ width: `${task.stepProgress.percentage}%` }}
              />
            </div>
            <span className="text-xs text-gray-400">{task.stepProgress.percentage}%</span>
          </div>
        )}
      </td>

      <td className="px-4 py-3">
        {task.assignees?.length > 0
          ? <AvatarGroup users={task.assignees} max={3} />
          : <span className="text-xs text-gray-300">—</span>
        }
      </td>

      <td className="px-4 py-3 whitespace-nowrap">
        <TaskStatusBadge status={task.status} />
      </td>

      <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
        <PriorityBadge priority={task.priority} />
      </td>

      <td className="px-4 py-3 text-right hidden lg:table-cell text-sm text-gray-500 whitespace-nowrap">
        {task.plannedEffortPh > 0 ? `${task.plannedEffortPh}h` : '—'}
      </td>

      <td className="px-4 py-3 text-right hidden lg:table-cell whitespace-nowrap">
        <span className={`text-sm font-medium ${
          task.slippagePh > 0 ? 'text-red-600' : task.slippagePh < 0 ? 'text-emerald-600' : 'text-gray-700'
        }`}>
          {task.actualEffortPh > 0 ? `${task.actualEffortPh}h` : '—'}
        </span>
        {task.slippagePh !== 0 && task.actualEffortPh > 0 && (
          <span className={`ml-1 text-xs ${task.slippagePh > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            ({task.slippagePh > 0 ? '+' : ''}{task.slippagePh}h)
          </span>
        )}
      </td>

      <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap">
        <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'font-semibold text-red-600' : 'text-gray-400'}`}>
          {task.plannedDueDate ? formatDate(task.plannedDueDate) : '—'}
          {isOverdue && <AlertCircle className="h-3 w-3 text-red-500" />}
        </span>
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {next && (
            <button
              onClick={() => onStatusAdvance(task.id, next)}
              className="rounded px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 transition-colors whitespace-nowrap"
            >
              → {next.replace('_', ' ')}
            </button>
          )}
          <Link
            href={`/tasks/${task.id}`}
            className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Open
          </Link>
        </div>
      </td>
    </tr>
  );
}

export default function SprintTasksPage() {
  const { projectId, sprintId } = useParams<{ projectId: string; sprintId: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | ''>('');

  const companyId = user?.companyId ?? '';

  const { data: sprintRes } = useSprint(projectId, sprintId);
  const { data: tasksData, isLoading } = useSprintTasks(sprintId, {
    parentTaskId: 'null',
    search:   search        || undefined,
    status:   statusFilter  || undefined,
    priority: priorityFilter || undefined,
  });

  const sprint = sprintRes;

  const membersKey = ['sprint-members', sprintId];
  const { data: membersData } = useQuery({
    queryKey: membersKey,
    queryFn: () => sprintMembersApi.list(projectId, sprintId).then((r) => r.data.data ?? []),
    enabled: !!sprintId && !!projectId,
  });
  const members = membersData ?? [];

  const handleAddMember = async (userId: string) => {
    await sprintMembersApi.add(projectId, sprintId, userId);
  };

  const handleRemoveMember = async (userId: string) => {
    await sprintMembersApi.remove(projectId, sprintId, userId);
  };
  const { data: staffData } = useQuery({
    queryKey: ['staff-picker', companyId],
    queryFn: () => staffApi.list(companyId, { status: 'active', limit: 100 } as any).then((r) => r.data),
    enabled: showCreate && !!companyId && isAdmin,
  });
  const staffList = (staffData?.data ?? []).filter(
    (s: any) => s.user && s.user.fullName?.toLowerCase().includes(assigneeSearch.toLowerCase()),
  );

  const createTask = useCreateTask(sprintId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const tasks  = [...(tasksData?.data ?? [])].sort((a, b) => {
    if (a.status !== b.status) return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  });

  const handleStatusAdvance = async (taskId: string, status: TaskStatus) => {
    try {
      await tasksApi.updateStatus(taskId, status);
      qc.invalidateQueries({ queryKey: taskKeys.sprint(sprintId) });
      toast.success('Status updated');
    } catch (e: any) {
      toast.error(extractError(e));
    }
  };

  const onSubmit = (d: FormData) => {
    createTask.mutate(
      { ...d, assigneeIds: assigneeIds.length ? assigneeIds : undefined },
      { onSuccess: () => { setShowCreate(false); reset(); setAssigneeIds([]); setAssigneeSearch(''); setShowAssigneePicker(false); } },
    );
  };

  const total      = tasks.length;
  const done       = tasks.filter((t) => t.status === 'done').length;
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
  const overdue    = tasks.filter((t) => t.plannedDueDate && t.status !== 'done' && new Date(t.plannedDueDate) < new Date()).length;
  const completion = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <Header
        title={
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <Link href="/projects" className="shrink-0 text-gray-400 hover:text-gray-600">Projects</Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <Link href={`/projects/${projectId}`} className="shrink-0 text-gray-400 hover:text-gray-600 truncate max-w-[140px]">
              {sprint?.name ?? '…'}
            </Link>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300" />
            <span className="font-semibold text-gray-900 truncate">Tasks</span>
          </div>
        }
        actions={
          isAdmin && sprint?.status !== 'completed' && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          )
        }
      />

      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl space-y-4">

          {/* Sprint summary bar */}
          {sprint && (
            <div className="rounded-xl border border-gray-100 bg-white px-5 py-4">
              <div className="flex flex-wrap items-start gap-6">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-base font-bold text-gray-900">{sprint.name}</h1>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                      sprint.status === 'active'    ? 'bg-blue-50 text-blue-700' :
                      sprint.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                       'bg-gray-100 text-gray-500'
                    }`}>
                      {sprint.status === 'active' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
                      {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
                    </span>
                  </div>
                  {sprint.goal && <p className="mt-0.5 text-sm text-gray-500">{sprint.goal}</p>}
                  {sprint.startDate && (
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(sprint.startDate)} → {formatDate(sprint.endDate)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  {[
                    { label: 'Total',    value: total,      cls: 'text-gray-900' },
                    { label: 'Done',     value: done,       cls: 'text-emerald-600' },
                    { label: 'Active',   value: inProgress, cls: 'text-blue-600' },
                    { label: 'Overdue',  value: overdue,    cls: overdue > 0 ? 'text-red-600' : 'text-gray-300' },
                  ].map(({ label, value, cls }) => (
                    <div key={label} className="text-center">
                      <p className={`text-lg font-bold ${cls}`}>{value}</p>
                      <p className="text-xs text-gray-400">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {total > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Sprint completion</span>
                    <span className="text-xs font-medium text-gray-600">{completion}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full bg-emerald-500 transition-all" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sprint Members */}
          {sprint && (
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Sprint Members</h3>
                <span className="text-xs text-gray-400">({members.length})</span>
              </div>
              <MemberPicker
                companyId={companyId}
                members={members}
                onAdd={handleAddMember}
                onRemove={handleRemoveMember}
                isAdmin={isAdmin}
                queryKey={membersKey}
              />
            </div>
          )}

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks…"
                className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as TaskStatus | '')}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            >
              <option value="">All statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | '')}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 focus:border-gray-400 focus:outline-none"
            >
              <option value="">All priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            {(search || statusFilter || priorityFilter) && (
              <button
                onClick={() => { setSearch(''); setStatusFilter(''); setPriorityFilter(''); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Task table */}
          {isLoading ? (
            <PageSpinner />
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-14 text-center">
              <p className="text-sm text-gray-400">
                {search || statusFilter || priorityFilter ? 'No tasks match your filters' : 'No tasks in this sprint'}
              </p>
              {isAdmin && !search && !statusFilter && !priorityFilter && sprint?.status !== 'completed' && (
                <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" /> Add first task
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Task</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Assigned</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">Priority</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Planned</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">Actual</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">Due</th>
                    <th className="px-4 py-3 w-40" />
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      isAdmin={isAdmin}
                      onStatusAdvance={handleStatusAdvance}
                      projectId={projectId}
                      sprintId={sprintId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="Add Task" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Task name" placeholder="Implement user authentication" error={errors.name?.message} {...register('name')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe what needs to be done…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              {...register('description')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                className="h-9 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none"
                {...register('priority')}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <Input label="Due date" type="date" {...register('plannedDueDate')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Planned hours" type="number" min="0" step="0.5" placeholder="0" {...register('plannedEffortPh')} />
            <Input label="Estimated hours" type="number" min="0" step="0.5" placeholder="0" {...register('estimatedEffortPh')} />
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Assignees <span className="text-gray-400 font-normal">(optional)</span>
              </label>

              {/* Selected chips */}
              {assigneeIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {assigneeIds.map((id) => {
                    const s = staffList.find((s: any) => s.user?.id === id);
                    const name = s?.user?.fullName ?? id;
                    return (
                      <span key={id} className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                        {name}
                        <button type="button" onClick={() => setAssigneeIds((p) => p.filter((i) => i !== id))}>
                          <X className="h-3 w-3 text-gray-400 hover:text-red-500" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {!showAssigneePicker ? (
                <button
                  type="button"
                  onClick={() => setShowAssigneePicker(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-200 px-3 py-1.5 text-xs text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors w-full"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  {assigneeIds.length === 0 ? 'Assign team members' : 'Add more'}
                </button>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 p-2 border-b border-gray-100">
                    <Search className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <input
                      autoFocus
                      value={assigneeSearch}
                      onChange={(e) => setAssigneeSearch(e.target.value)}
                      placeholder="Search staff…"
                      className="flex-1 text-sm outline-none"
                    />
                    <button type="button" onClick={() => { setShowAssigneePicker(false); setAssigneeSearch(''); }}>
                      <X className="h-4 w-4 text-gray-400 hover:text-gray-700" />
                    </button>
                  </div>
                  <ul className="max-h-36 overflow-y-auto">
                    {staffList.length === 0 && (
                      <li className="px-3 py-2 text-xs text-gray-400 text-center">No active staff found</li>
                    )}
                    {staffList.map((s: any) => {
                      const uid = s.user?.id;
                      const selected = uid && assigneeIds.includes(uid);
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => {
                              if (!uid) return;
                              setAssigneeIds((p) => selected ? p.filter((i) => i !== uid) : [...p, uid]);
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 hover:bg-gray-50 transition-colors"
                          >
                            <div className="h-5 w-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                              {s.user?.fullName?.[0] ?? '?'}
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-xs font-medium text-gray-800 truncate">{s.user?.fullName ?? s.email}</p>
                              {s.designation && <p className="text-xs text-gray-400 truncate">{s.designation}</p>}
                            </div>
                            {selected && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => { setShowCreate(false); reset(); setAssigneeIds([]); setAssigneeSearch(''); setShowAssigneePicker(false); }}>Cancel</Button>
            <Button type="submit" loading={createTask.isPending}>Create task</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
