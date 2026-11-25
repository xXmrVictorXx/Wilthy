import { z } from 'zod';
import { defineContract } from '../../core/protocol/contract';

export interface GradeComponents {
  readonly process: string | null;
  readonly skill: string | null;
  readonly midterm: string | null;
  readonly final: string | null;
}

export interface GradeRecord {
  readonly semester: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly credits: number;
  readonly earnedCredits: number | null;
  readonly category: string;
  readonly nature: string;
  readonly assessment: string;
  readonly status: string;
  readonly form: string;
  readonly score: string;
  readonly gradePoint: number | null;
  readonly minor: boolean;
  readonly note: string | null;
  /** 原始成绩里的平时（过程、技能、期中）与期末分项；未取到原始成绩时为 null。 */
  readonly components: GradeComponents | null;
}

/** 教务系统给出的汇总，口径以学校为准（不是 Wilthy 自算）。 */
export interface GradeSummary {
  readonly attemptedCredits: number;
  readonly earnedCredits: number;
  readonly gpaCredits: number;
  readonly gpa: number;
}

export interface GradesState {
  readonly lastSyncedAt: string | null;
  readonly summary: GradeSummary | null;
}

export interface GradesResult {
  readonly ok: boolean;
  readonly error?: string;
  readonly reason?: 'auth';
}

export const gradesContract = defineContract('grades', {
  state: { input: z.undefined(), output: z.custom<GradesState>() },
  list: { input: z.undefined(), output: z.custom<GradeRecord[]>() },
  sync: { input: z.undefined(), output: z.custom<GradesResult>() },
  connect: { input: z.undefined(), output: z.custom<GradesResult>() },
});

declare module '../../app/module' {
  interface NavTargets {
    grades: {};
  }
}
