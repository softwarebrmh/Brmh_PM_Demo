'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, ChevronRight, Play, CheckCircle, Clock, ArrowRight, Users } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { MemberPicker } from '@/components/ui/member-picker';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useProject, useSprints, useCreateSprint, useStartSprint, useEndSprint } from '@/lib/hooks/use-projects';
import { projectMembersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import type { SprintStatus } from '@/types';

const schema = z.object({
  name:      z.string().min(1, 'Sprint name required'),
  goal:      z.string().optional(),
  startDate: z.string().optional(),
  endDate:   z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function SprintStatusIndicator({ status }: { status: SprintStatus }) {
  const map = {
    draft:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-500' },
    active:    { label: 'Active',    cls: 'bg-blue-50 text-blue-700' },
    completed: { label: 'Completed', cls: 'bg-emerald-50 text-emerald-700' },
  };
  const { label, cls } = map[status];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status === 'active' && <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />}
      {label}
    </span>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const companyId = user?.companyId ?? '';
  const [showCreate, setShowCreate] = useState(false);

  const { data: projectRes, isLoading: projectLoading } = useProject(companyId, projectId);
  const { data: sprintsRes, isLoading: sprintsLoading } = useSprints(projectId);
  const createSprint = useCreateSprint(projectId);
  const startSprint  = useStartSprint(projectId);
  const endSprint    = useEndSprint(projectId);

  const membersKey = ['project-members', projectId];
  const { data: membersData } = useQuery({
    queryKey: membersKey,
    queryFn: () => projectMembersApi.list(projectId, companyId).then((r) => r.data.data ?? []),
    enabled: !!projectId && !!companyId,
  });
  const members = membersData ?? [];

  const handleAddMember = async (userId: string) => {
    await projectMembersApi.add(companyId, projectId, userId);
  };

  const handleRemoveMember = async (userId: string) => {
    await projectMembersApi.remove(companyId, projectId, userId);
  };

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (d: FormData) => {
    createSprint.mutate(d, { onSuccess: () => { setShowCreate(false); reset(); } });
  };

  const project = projectRes;

  if (projectLoading || sprintsLoading) return <PageSpinner />;

  const sprints = sprintsRes?.data ?? [];
  const activeSprint   = sprints.find((s) => s.status === 'active');
  const draftSprints   = sprints.filter((s) => s.status === 'draft');
  const doneSprints    = sprints.filter((s) => s.status === 'completed');

  const groups = [
    { label: 'Active',    items: activeSprint ? [activeSprint] : [] },
    { label: 'Draft',     items: draftSprints },
    { label: 'Completed', items: doneSprints },
  ].filter((g) => g.items.length > 0);

  return (
    <>
      <Header
        title={
          <div className="flex items-center gap-1.5 text-sm">
            <Link href="/projects" className="text-gray-400 hover:text-gray-600">Projects</Link>
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
            <span className="font-semibold text-gray-900">{project?.name}</span>
          </div>
        }
        actions={
          isAdmin && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> New Sprint
            </Button>
          )
        }
      />

      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* Project header */}
          {project && (
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{project.name}</h1>
                  {project.description && (
                    <p className="mt-1 text-sm text-gray-500">{project.description}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    {project.sprintCount} sprint{project.sprintCount !== 1 ? 's' : ''} · Created by {project.createdBy?.fullName} · {formatDate(project.createdAt)}
                  </p>
                </div>
                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium ${
                  project.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {project.status === 'active' ? 'Active' : 'Archived'}
                </span>
              </div>
            </div>
          )}

          {/* Project Members */}
          {project && (
            <div className="rounded-xl border border-gray-100 bg-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-900">Project Members</h3>
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

          {/* Sprints */}
          {sprints.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
              <Clock className="mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-400">No sprints yet</p>
              {isAdmin && (
                <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="h-4 w-4" /> Create first sprint
                </Button>
              )}
            </div>
          ) : (
            groups.map(({ label, items }) => (
              <section key={label}>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {label} — {items.length}
                </h2>
                <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Sprint</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hidden md:table-cell">Goal</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hidden lg:table-cell">Dates</th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Tasks</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((sprint) => (
                        <tr key={sprint.id} className="group hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <SprintStatusIndicator status={sprint.status} />
                              <Link
                                href={`/projects/${projectId}/sprints/${sprint.id}`}
                                className="font-medium text-gray-900 hover:underline"
                              >
                                {sprint.name}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs">
                            <p className="truncate">{sprint.goal ?? '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-400 hidden lg:table-cell text-xs">
                            {sprint.startDate
                              ? `${formatDate(sprint.startDate)} → ${formatDate(sprint.endDate)}`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-gray-500">{sprint.taskCount}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {isAdmin && sprint.status === 'draft' && (
                                <button
                                  onClick={() => startSprint.mutate(sprint.id)}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                                >
                                  <Play className="h-3 w-3" /> Start
                                </button>
                              )}
                              {isAdmin && sprint.status === 'active' && (
                                <button
                                  onClick={() => endSprint.mutate(sprint.id)}
                                  className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <CheckCircle className="h-3 w-3" /> Complete
                                </button>
                              )}
                              <Link
                                href={`/projects/${projectId}/sprints/${sprint.id}`}
                                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                              >
                                View tasks <ArrowRight className="h-3 w-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
        </div>
      </main>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="New Sprint" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Sprint name" placeholder="Sprint 1" error={errors.name?.message} {...register('name')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={2}
              placeholder="What does this sprint aim to achieve?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              {...register('goal')}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start date" type="date" {...register('startDate')} />
            <Input label="End date"   type="date" {...register('endDate')} />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createSprint.isPending}>Create sprint</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
