'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, FolderOpen, Archive, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageSpinner } from '@/components/ui/spinner';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useProjects, useCreateProject, useArchiveProject } from '@/lib/hooks/use-projects';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/types';

const schema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-flex h-1.5 w-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
  );
}

export default function ProjectsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const companyId = user?.companyId ?? '';

  const [showCreate, setShowCreate] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const { data, isLoading } = useProjects(companyId);
  const createProject = useCreateProject(companyId);
  const archiveProject = useArchiveProject(companyId);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (d: FormData) => {
    createProject.mutate(d, { onSuccess: () => { setShowCreate(false); reset(); } });
  };

  const projects = data?.data ?? [];
  const active   = projects.filter((p) => p.status === 'active');
  const archived = projects.filter((p) => p.status === 'archived');

  if (isLoading) return <PageSpinner />;

  return (
    <>
      <Header
        title="Projects"
        actions={
          isAdmin && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4" /> New Project
            </Button>
          )
        }
      />

      <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* Active projects */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Active — {active.length}
              </h2>
            </div>

            {active.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-white py-12 text-center">
                <FolderOpen className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm font-medium text-gray-400">No projects yet</p>
                {isAdmin && (
                  <Button size="sm" className="mt-4" onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4" /> Create first project
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Project</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hidden md:table-cell">Sprints</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hidden lg:table-cell">Created</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400 hidden lg:table-cell">Owner</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {active.map((project) => (
                      <tr key={project.id} className="group hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link href={`/projects/${project.id}`} className="flex items-center gap-2.5">
                            <StatusDot status={project.status} />
                            <div>
                              <p className="font-medium text-gray-900 group-hover:text-black">{project.name}</p>
                              {project.description && (
                                <p className="text-xs text-gray-400 truncate max-w-xs">{project.description}</p>
                              )}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-gray-500">{project.sprintCount} sprint{project.sprintCount !== 1 ? 's' : ''}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{formatDate(project.createdAt)}</td>
                        <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">{project.createdBy?.fullName}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {isAdmin && (
                              <button
                                onClick={() => archiveProject.mutate(project.id)}
                                className="hidden group-hover:inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                              >
                                <Archive className="h-3 w-3" /> Archive
                              </button>
                            )}
                            <Link
                              href={`/projects/${project.id}`}
                              className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                              Open <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Archived toggle */}
          {archived.length > 0 && (
            <section>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showArchived ? 'rotate-90' : ''}`} />
                Archived — {archived.length}
              </button>

              {showArchived && (
                <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-white opacity-70">
                  <table className="w-full text-sm">
                    <tbody className="divide-y divide-gray-50">
                      {archived.map((project) => (
                        <tr key={project.id} className="group hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Archive className="h-3.5 w-3.5 text-gray-300" />
                              <p className="font-medium text-gray-500">{project.name}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400">{formatDate(project.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      <Modal open={showCreate} onClose={() => { setShowCreate(false); reset(); }} title="New Project" size="sm">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Project name" placeholder="Platform V2" error={errors.name?.message} {...register('name')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea
              rows={3}
              placeholder="What is this project about?"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
              {...register('description')}
            />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => { setShowCreate(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createProject.isPending}>Create project</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
