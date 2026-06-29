import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getAdminDashboard(companyId: string) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) throw new NotFoundException('Company not found');

    const [
      totalStaff,
      activeStaff,
      totalProjects,
      activeProjects,
      activeSprints,
      taskStats,
      recentActivity,
    ] = await Promise.all([
      this.prisma.companyStaff.count({ where: { companyId, deletedAt: null } }),
      this.prisma.companyStaff.count({ where: { companyId, status: 'active', deletedAt: null } }),
      this.prisma.project.count({ where: { companyId, deletedAt: null } }),
      this.prisma.project.count({ where: { companyId, status: 'active', deletedAt: null } }),
      this.prisma.sprint.count({
        where: { project: { companyId }, status: 'active', deletedAt: null },
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
          sprint: { project: { companyId }, deletedAt: null },
        },
        _count: { id: true },
      }),
      this.prisma.auditTrail.findMany({
        where: { companyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { actor: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
      }),
    ]);

    const taskStatusMap: Record<string, number> = {};
    for (const group of taskStats) {
      taskStatusMap[group.status] = group._count.id;
    }

    return {
      success: true,
      data: {
        staff: { total: totalStaff, active: activeStaff, pending: totalStaff - activeStaff },
        projects: { total: totalProjects, active: activeProjects },
        sprints: { active: activeSprints },
        tasks: {
          todo: taskStatusMap['todo'] ?? 0,
          inProgress: taskStatusMap['in_progress'] ?? 0,
          review: taskStatusMap['review'] ?? 0,
          done: taskStatusMap['done'] ?? 0,
          total: Object.values(taskStatusMap).reduce((a, b) => a + b, 0),
        },
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          actor: a.actor,
          createdAt: a.createdAt,
        })),
      },
    };
  }

  async getStaffDashboard(user: JwtPayload) {
    const companyId = user.companyId;
    if (!companyId) throw new NotFoundException('No company context');

    const [myTasks, myTaskStats, myActiveSprints, recentActivity] = await Promise.all([
      this.prisma.task.findMany({
        where: {
          deletedAt: null,
          assignees: { some: { userId: user.sub, isActive: true } },
          sprint: { deletedAt: null, project: { deletedAt: null } },
        },
        include: {
          sprint: {
            select: {
              id: true, name: true, status: true, endDate: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { plannedDueDate: 'asc' },
        take: 10,
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: {
          deletedAt: null,
          assignees: { some: { userId: user.sub, isActive: true } },
          sprint: { deletedAt: null },
        },
        _count: { id: true },
      }),
      this.prisma.sprint.findMany({
        where: {
          status: 'active',
          deletedAt: null,
          project: { companyId, deletedAt: null },
          tasks: { some: { assignees: { some: { userId: user.sub, isActive: true } } } },
        },
        include: {
          project: { select: { id: true, name: true } },
          _count: { select: { tasks: { where: { deletedAt: null } } } },
        },
        take: 5,
      }),
      this.prisma.auditTrail.findMany({
        where: { companyId, actorId: user.sub },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const taskStatusMap: Record<string, number> = {};
    for (const group of myTaskStats) {
      taskStatusMap[group.status] = group._count.id;
    }

    return {
      success: true,
      data: {
        myTasks: {
          todo: taskStatusMap['todo'] ?? 0,
          inProgress: taskStatusMap['in_progress'] ?? 0,
          review: taskStatusMap['review'] ?? 0,
          done: taskStatusMap['done'] ?? 0,
        },
        upcomingTasks: myTasks.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          priority: t.priority,
          plannedDueDate: t.plannedDueDate,
          sprint: t.sprint,
        })),
        activeSprints: myActiveSprints.map((s) => ({
          id: s.id,
          name: s.name,
          goal: s.goal,
          status: s.status,
          project: s.project,
          startDate: s.startDate,
          endDate: s.endDate,
          taskCount: s._count.tasks,
        })),
        recentActivity: recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          entityType: a.entityType,
          entityId: a.entityId,
          createdAt: a.createdAt,
        })),
      },
    };
  }

  async getProjectSummary(projectId: string) {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
    if (!project) throw new NotFoundException('Project not found');

    const [sprints, taskStats, staffCount] = await Promise.all([
      this.prisma.sprint.findMany({
        where: { projectId, deletedAt: null },
        include: {
          _count: {
            select: {
              tasks: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { sprint: { projectId }, deletedAt: null },
        _count: { id: true },
      }),
      this.prisma.task.findMany({
        where: { sprint: { projectId }, deletedAt: null },
        select: { assignees: { where: { isActive: true }, select: { userId: true } } },
      }),
    ]);

    const taskStatusMap: Record<string, number> = {};
    for (const group of taskStats) taskStatusMap[group.status] = group._count.id;

    const uniqueStaff = new Set<string>();
    for (const task of staffCount) {
      for (const a of task.assignees) uniqueStaff.add(a.userId);
    }

    return {
      success: true,
      data: {
        project: { id: project.id, name: project.name, status: project.status },
        sprints: sprints.map((s) => ({
          id: s.id, name: s.name, status: s.status,
          startDate: s.startDate, endDate: s.endDate, taskCount: s._count.tasks,
        })),
        tasks: {
          todo: taskStatusMap['todo'] ?? 0,
          inProgress: taskStatusMap['in_progress'] ?? 0,
          review: taskStatusMap['review'] ?? 0,
          done: taskStatusMap['done'] ?? 0,
        },
        uniqueStaffCount: uniqueStaff.size,
      },
    };
  }
}
