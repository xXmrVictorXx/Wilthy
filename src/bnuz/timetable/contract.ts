import { z } from 'zod';
import { defineContract } from '../../core/protocol/contract';

export interface TimetableLesson {
  readonly id: number;
  readonly semester: string;
  readonly courseCode: string;
  readonly courseName: string;
  readonly className: string | null;
  readonly teacher: string | null;
  readonly campus: string | null;
  readonly classroom: string | null;
  readonly weekday: number;
  readonly startPeriod: number;
  readonly endPeriod: number;
  readonly periodsText: string;
  readonly weeksText: string;
  readonly weekNumbers: readonly number[];
  readonly credits: number | null;
  readonly note: string | null;
}

export interface TimetableState {
  readonly semester: string;
  readonly lastSyncedAt: string | null;
  readonly semesterStart: string | null;
  /** 可选的学期：入学学年起到当前学期，最近的在前。 */
  readonly semesters: readonly string[];
}

export function semesterRange(enrollmentYear: number | null, current: string): string[] {
  const [startText, , termText] = current.split('-');
  const range = [current];
  if (enrollmentYear === null) return range;
  let year = Number(startText);
  let term = Number(termText);
  while (year > enrollmentYear || term > 1) {
    term -= 1;
    if (term === 0) {
      term = 3;
      year -= 1;
    }
    range.push(`${year}-${year + 1}-${term}`);
  }
  return range;
}

export interface TimetableResult {
  readonly ok: boolean;
  readonly error?: string;
  /** 非空表示失败原因是登录失效，界面据此引导重新登录而非当作普通失败。 */
  readonly reason?: 'auth';
}

// 北京师范大学珠海校区作息时间（教务系统「公共查询 › 作息时间」），单位为当天分钟数。
export const classPeriods = [
  [8 * 60, 8 * 60 + 45],
  [8 * 60 + 55, 9 * 60 + 40],
  [10 * 60, 10 * 60 + 45],
  [10 * 60 + 55, 11 * 60 + 40],
  [13 * 60 + 30, 14 * 60 + 15],
  [14 * 60 + 25, 15 * 60 + 10],
  [15 * 60 + 30, 16 * 60 + 15],
  [16 * 60 + 25, 17 * 60 + 10],
  [18 * 60, 18 * 60 + 45],
  [18 * 60 + 55, 19 * 60 + 40],
  [19 * 60 + 50, 20 * 60 + 35],
  [20 * 60 + 45, 21 * 60 + 30],
] as const;

/** 第 99 节是教务系统里的「中午」时段。 */
const NOON_PERIOD = [11 * 60 + 50, 13 * 60 + 20] as const;

export function periodTime(period: number): readonly [number, number] | undefined {
  return period === 99 ? NOON_PERIOD : classPeriods[period - 1];
}

export const semesterSchema = z.string().regex(/^\d{4}-\d{4}-[123]$/);

const result = z.custom<TimetableResult>();
const state = z.custom<TimetableState>();

export const timetableContract = defineContract('timetable', {
  state: { input: semesterSchema.optional(), output: state },
  lessons: { input: semesterSchema.optional(), output: z.custom<TimetableLesson[]>() },
  setSemesterStart: {
    input: z.object({
      semester: semesterSchema,
      value: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }),
    output: z.void(),
  },
  sync: { input: semesterSchema.optional(), output: result },
  connect: { input: z.undefined(), output: result },
});

declare module '../../app/module' {
  interface NavTargets {
    timetable: {};
  }
}
