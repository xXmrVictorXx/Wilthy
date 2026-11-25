import type { WebContents } from 'electron';
import { z } from 'zod';
import { hostPorts } from '../../../core/ports';
import {
  semesterSchema,
  type TimetableLesson,
  type TimetableResult,
  type TimetableState,
} from '../contract';
import { lessonOccurrences } from './schedule';
import { parseTimetableList } from './parse';
import {
  CampusAuthError,
  flushCampusSession,
  jwxtRequest,
  openJwxtLoginWindow,
  toJwxtTerm,
} from '../../campus';

type LessonRow = {
  id: number;
  semester: string;
  course_code: string;
  course_name: string;
  class_name: string | null;
  teacher: string | null;
  campus: string | null;
  classroom: string | null;
  weekday: number;
  start_period: number;
  end_period: number;
  periods_text: string;
  weeks_text: string;
  week_numbers: string;
  credits: number | null;
  note: string | null;
};

export function currentSemester(now = new Date()): string {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 9) return `${year}-${year + 1}-1`;
  if (month <= 2) return `${year - 1}-${year}-1`;
  if (month <= 7) return `${year - 1}-${year}-2`;
  return `${year - 1}-${year}-3`;
}

function syncRow(
  semester: string,
): { last_synced_at: string; semester_start: string | null } | undefined {
  return hostPorts()
    .database()
    .prepare('SELECT last_synced_at, semester_start FROM timetable_sync WHERE semester = ?')
    .get(semester) as { last_synced_at: string; semester_start: string | null } | undefined;
}

function mapRow(row: LessonRow): TimetableLesson {
  let weekNumbers: number[] = [];
  try {
    const parsed: unknown = JSON.parse(row.week_numbers);
    if (Array.isArray(parsed))
      weekNumbers = parsed.filter((week): week is number => Number.isInteger(week));
  } catch {
    // Keep the cached lesson visible even if a future schema changes the stored value.
  }
  return {
    id: row.id,
    semester: row.semester,
    courseCode: row.course_code,
    courseName: row.course_name,
    className: row.class_name,
    teacher: row.teacher,
    campus: row.campus,
    classroom: row.classroom,
    weekday: row.weekday,
    startPeriod: row.start_period,
    endPeriod: row.end_period,
    periodsText: row.periods_text,
    weeksText: row.weeks_text,
    weekNumbers,
    credits: row.credits,
    note: row.note,
  };
}

export async function openLoginWindow(sender: WebContents): Promise<TimetableResult> {
  return openJwxtLoginWindow(sender);
}

async function fetchSemesterStart(semester: string): Promise<string | null> {
  const { xn, xq } = toJwxtTerm(semester);
  const text = await jwxtRequest(
    `/public/getDateByTeachingWeek.action?hidOption=FOW&xn=${xn}&xq=${xq}&zc=1&xnq=1`,
    { method: 'POST' },
  );
  return /^\d{4}-\d{2}-\d{2}$/.test(text.trim()) ? text.trim() : null;
}

async function fetchTimetableData(semester: string) {
  const { xn, xq } = toJwxtTerm(semester);
  const params = Buffer.from(`xn=${xn}&xq=${xq}`).toString('base64');
  const html = await jwxtRequest(
    `/wsxk/xkjg.ckdgxsxdkchj_data10319.jsp?params=${encodeURIComponent(params)}`,
  );
  const lessons = parseTimetableList(html, semester);
  return { lessons, semesterStart: await fetchSemesterStart(semester) };
}

export async function syncTimetable(semester: string): Promise<TimetableResult> {
  try {
    const { lessons, semesterStart } = await fetchTimetableData(semester);
    await flushCampusSession();

    const db = hostPorts().database();
    const insert = db.prepare(
      `INSERT INTO timetable_lessons
       (semester, source_id, course_code, course_name, class_name, teacher, campus, classroom,
        weekday, start_period, end_period, periods_text, weeks_text, week_numbers, credits, note)
       VALUES (@semester, @sourceId, @courseCode, @courseName, @className, @teacher, @campus,
        @classroom, @weekday, @startPeriod, @endPeriod, @periodsText, @weeksText, @weekNumbers,
        @credits, @note)`,
    );
    const syncedAt = new Date().toISOString();
    db.transaction(() => {
      db.prepare('DELETE FROM timetable_lessons WHERE semester = ?').run(semester);
      for (const lesson of lessons) insert.run(lesson);
      db.prepare(
        `INSERT INTO timetable_sync (semester, last_synced_at, semester_start) VALUES (?, ?, ?)
         ON CONFLICT(semester) DO UPDATE SET
           last_synced_at = excluded.last_synced_at,
           semester_start = COALESCE(excluded.semester_start, timetable_sync.semester_start)`,
      ).run(semester, syncedAt, semesterStart);
    })();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      ...(error instanceof CampusAuthError ? { reason: 'auth' as const } : {}),
    };
  }
}

export function listLessons(semester: string): TimetableLesson[] {
  const rows = hostPorts()
    .database()
    .prepare(
      `SELECT * FROM timetable_lessons WHERE semester = ?
       ORDER BY weekday, start_period, course_name`,
    )
    .all(semester) as LessonRow[];
  return rows.map(mapRow);
}

export const scheduleQuerySchema = z
  .object({
    semester: semesterSchema.optional(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
  })
  .strict()
  .refine(
    (value) =>
      Date.parse(value.endAt) > Date.parse(value.startAt) &&
      Date.parse(value.endAt) - Date.parse(value.startAt) <= 366 * 86400000,
    '查询范围必须为正数且不超过一年',
  );

export function querySchedule(input: unknown) {
  const args = scheduleQuerySchema.parse(input);
  const semester = args.semester ?? currentSemester();
  const row = syncRow(semester);
  const courses = lessonOccurrences(
    listLessons(semester),
    row?.semester_start ?? null,
    args.startAt,
    args.endAt,
  );
  const warnings = [...courses.warnings];
  if (!row?.last_synced_at) warnings.push('该学期课表尚未同步');
  return {
    semester,
    timezone: 'Asia/Shanghai',
    items: courses.items.sort((a, b) => a.startAt.localeCompare(b.startAt)),
    coverage: {
      courseSyncedAt: row?.last_synced_at || null,
      complete: warnings.length === 0,
      warnings,
    },
  };
}

export function getTimetableState(semester = currentSemester()): TimetableState {
  const row = syncRow(semester);
  return {
    semester,
    lastSyncedAt: row?.last_synced_at || null,
    semesterStart: row?.semester_start ?? null,
  };
}

export function setSemesterStart(semester: string, value: string) {
  // 手动补设学期日期时可能还没有同步记录，先落到空串以满足 NOT NULL。
  hostPorts()
    .database()
    .prepare(
      `INSERT INTO timetable_sync (semester, last_synced_at, semester_start) VALUES (?, '', ?)
       ON CONFLICT(semester) DO UPDATE SET semester_start = excluded.semester_start`,
    )
    .run(semester, value);
}
