import { z } from 'zod';
import { defineContract } from '../../core/protocol/contract';

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

export interface ModuleSummary {
  readonly module: string;
  readonly earnedCredits: number;
  readonly passed: number;
  readonly total: number;
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

export function isPassingScore(score: string | null): boolean {
  if (!score) return false;
  const value = Number(score);
  return Number.isFinite(value) ? value >= 60 : PASSING_LEVELS.has(score);
}

/** 教务系统没有给出各模块应修学分，这里只汇总已获学分与课程数。 */
export function summarizeModules(courses: readonly ModuleCourse[]): ModuleSummary[] {
  const modules = new Map<string, { earnedCredits: number; passed: number; total: number }>();
  for (const course of courses) {
    const entry = modules.get(course.module) ?? { earnedCredits: 0, passed: 0, total: 0 };
    entry.total += 1;
    if (isPassingScore(course.score)) {
      entry.passed += 1;
      entry.earnedCredits += course.credits;
    }
    modules.set(course.module, entry);
  }
  return [...modules].map(([module, entry]) => ({ module, ...entry }));
}

export const programContract = defineContract('program', {
  state: { input: z.undefined(), output: z.custom<ProgramState>() },
  plan: { input: z.undefined(), output: z.custom<PlannedCourse[]>() },
  progress: { input: z.undefined(), output: z.custom<ModuleCourse[]>() },
  sync: { input: z.undefined(), output: z.custom<ProgramResult>() },
});

declare module '../../app/module' {
  interface NavTargets {
    program: {};
  }
}
