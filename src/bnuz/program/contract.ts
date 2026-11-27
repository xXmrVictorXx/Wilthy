import { z } from 'zod';
import { defineContract } from '../../core/protocol/contract';
import type { GradeRecord } from '../grades/contract';

export interface PlannedCourse {
  readonly semester: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  readonly category: string;
  readonly assessment: string;
  readonly hours: number;
}

export interface ModuleCourse {
  readonly module: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  readonly hours: number;
  /** 培养方案里的开设学期序号，如「一」「五」。 */
  readonly term: string;
  readonly score: string | null;
  readonly selected: boolean;
}

/** user 是用户在页面上填的，agent 是 Agent 从培养方案文件读出的。 */
export type FilledBy = 'user' | 'agent';

export interface CreditRequirement {
  /** 「课程模块/课程类别」，与成绩记录的类别写法一致。 */
  readonly category: string;
  readonly credits: number;
  readonly note: string | null;
  readonly filledBy: FilledBy;
}

export interface CategoryCourse {
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  /** passed 已获学分；failed 修过未通过；ongoing 本学期在修；planned 方案内还没修。 */
  readonly status: 'passed' | 'failed' | 'ongoing' | 'planned';
  readonly score: string | null;
}

export interface CategoryProgress {
  readonly category: string;
  readonly requirement: CreditRequirement | null;
  readonly earnedCredits: number;
  readonly ongoingCredits: number;
  readonly courses: readonly CategoryCourse[];
}

export interface ProgramOverview {
  readonly total: { readonly credits: number; readonly filledBy: FilledBy } | null;
  readonly earnedCredits: number;
  readonly ongoingCredits: number;
  readonly categories: readonly CategoryProgress[];
}

export interface OngoingCourse {
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number | null;
}

export interface ProgramState {
  readonly lastSyncedAt: string | null;
}

export interface ProgramResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly reason?: 'auth';
}

const PASSING_LEVELS = new Set(['优秀', '良好', '中等', '及格', '合格', '通过']);
export const UNCATEGORIZED = '未归入培养方案';

export function isPassingScore(score: string | null): boolean {
  if (!score) return false;
  const value = Number(score);
  return Number.isFinite(value) ? value >= 60 : PASSING_LEVELS.has(score);
}

/** 对比表的模块多一级必修/选修，理论课程表的类别是「类别/模块」倒序；都换成成绩记录的写法。 */
export function categoryOfModule(module: string): string {
  return module.split('/').slice(0, 2).join('/');
}

export function categoryOfPlan(category: string): string {
  return category.split('/').reverse().join('/');
}

/**
 * 按类别汇总已获与在修学分：成绩优先，同一课程号只归一个类别、只算一次，辅修不计入主修；
 * 在修课程取本学期课表里还没有成绩的课，类别按培养方案查。
 */
export function buildOverview(input: {
  readonly progress: readonly ModuleCourse[];
  readonly plan: readonly PlannedCourse[];
  readonly grades: readonly Pick<
    GradeRecord,
    'courseCode' | 'courseName' | 'category' | 'credits' | 'earnedCredits' | 'score' | 'minor'
  >[];
  readonly ongoing: readonly OngoingCourse[];
  readonly requirements: readonly CreditRequirement[];
  readonly total: ProgramOverview['total'];
}): ProgramOverview {
  const courses = new Map<string, { category: string; course: CategoryCourse }>();
  for (const record of input.grades) {
    if (record.minor) continue;
    const earned = record.earnedCredits ?? 0;
    const passed = earned > 0 || isPassingScore(record.score);
    const known = courses.get(record.courseCode);
    if (known?.course.status === 'passed') continue;
    courses.set(record.courseCode, {
      category: record.category,
      course: {
        courseCode: record.courseCode,
        courseName: record.courseName,
        credits: passed ? earned : record.credits,
        status: passed ? 'passed' : 'failed',
        score: record.score,
      },
    });
  }
  const planned = new Map<string, { category: string; credits: number }>();
  for (const course of input.plan)
    planned.set(course.courseCode, {
      category: categoryOfPlan(course.category),
      credits: course.credits,
    });
  for (const course of input.progress)
    planned.set(course.courseCode, {
      category: categoryOfModule(course.module),
      credits: course.credits,
    });
  for (const course of input.ongoing) {
    if (courses.get(course.courseCode)?.course.status === 'passed') continue;
    const plan = planned.get(course.courseCode);
    courses.set(course.courseCode, {
      category: plan?.category ?? UNCATEGORIZED,
      course: {
        courseCode: course.courseCode,
        courseName: course.courseName,
        credits: course.credits ?? plan?.credits ?? 0,
        status: 'ongoing',
        score: null,
      },
    });
  }
  for (const course of input.progress) {
    if (courses.has(course.courseCode)) continue;
    const passed = isPassingScore(course.score);
    courses.set(course.courseCode, {
      category: categoryOfModule(course.module),
      course: {
        courseCode: course.courseCode,
        courseName: course.courseName,
        credits: course.credits,
        status: passed ? 'passed' : course.score ? 'failed' : 'planned',
        score: course.score,
      },
    });
  }

  const order = [
    ...input.progress.map((course) => categoryOfModule(course.module)),
    ...[...courses.values()].map(({ category }) => category),
    ...input.requirements.map(({ category }) => category),
  ];
  const byCategory = new Map<string, CategoryCourse[]>();
  for (const { category, course } of courses.values())
    byCategory.set(category, [...(byCategory.get(category) ?? []), course]);
  const requirements = new Map(input.requirements.map((item) => [item.category, item]));
  const sum = (items: readonly CategoryCourse[], status: CategoryCourse['status']) =>
    items.filter((course) => course.status === status).reduce((total, c) => total + c.credits, 0);
  const categories = [...new Set(order)].map((category) => {
    const items = byCategory.get(category) ?? [];
    return {
      category,
      requirement: requirements.get(category) ?? null,
      earnedCredits: sum(items, 'passed'),
      ongoingCredits: sum(items, 'ongoing'),
      courses: items,
    };
  });
  return {
    total: input.total,
    earnedCredits: categories.reduce((total, item) => total + item.earnedCredits, 0),
    ongoingCredits: categories.reduce((total, item) => total + item.ongoingCredits, 0),
    categories,
  };
}

const overview = z.custom<ProgramOverview>();
const credits = z.number().min(0).max(400).nullable();

export const programContract = defineContract(
  'program',
  {
    state: { input: z.undefined(), output: z.custom<ProgramState>() },
    plan: { input: z.undefined(), output: z.custom<PlannedCourse[]>() },
    overview: { input: z.undefined(), output: overview },
    /** credits 为 null 时清空该类别的要求。 */
    setRequirement: {
      input: z.object({ category: z.string().trim().min(1).max(100), credits }).strict(),
      output: overview,
    },
    setTotal: { input: credits, output: overview },
    sync: { input: z.undefined(), output: z.custom<ProgramResult>() },
    connect: { input: z.undefined(), output: z.custom<ProgramResult>() },
  },
  { overview },
);

declare module '../../app/module' {
  interface NavTargets {
    program: {};
  }
}
