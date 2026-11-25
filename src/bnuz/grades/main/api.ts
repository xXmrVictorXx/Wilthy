import { hostPorts } from '../../../core/ports';
import { CampusAuthError, flushCampusSession, jwxtRequest, jwxtToken } from '../../campus';
import type { GradeRecord, GradeSummary, GradesResult, GradesState } from '../contract';
import { parseRawGrades, parseValidGrades } from './parse';

const MENU = 'JW130706';
// 查询范围取「入学以来」，学年学期参数只是表单必填项。
const FORM = { sjxz: 'sjxz1', zfx: '0', xn: '2026', xn1: '2027', xq: '0', menucode_current: MENU };

type GradeRow = {
  semester: string;
  course_code: string;
  course_name: string;
  credits: number;
  earned_credits: number | null;
  category: string;
  nature: string;
  assessment: string;
  status: string;
  form: string;
  score: string;
  grade_point: number | null;
  minor: number;
  note: string | null;
  components: string | null;
};

async function fetchGrades() {
  const valid = parseValidGrades(
    await jwxtRequest('/student/xscj.chkdgxscjyxxjd_data.jsp', {
      form: { ...FORM, ysyx: 'yxcj' },
    }),
  );
  const token = await jwxtToken('xscj.stuckcj.my.jsp');
  const raw = parseRawGrades(
    await jwxtRequest('/student/xscj.stuckcj_data.jsp', {
      form: { ...FORM, ysyx: 'yscj', t: token },
    }),
  );
  const records = valid.records.map((record) => ({
    ...record,
    components: raw.get(`${record.semester}|${record.courseCode}`) ?? null,
  }));
  return { records, summary: valid.summary };
}

export async function syncGrades(): Promise<GradesResult> {
  try {
    const { records, summary } = await fetchGrades();
    await flushCampusSession();
    const db = hostPorts().database();
    const insert = db.prepare(
      `INSERT OR REPLACE INTO grades_records
       (semester, course_code, course_name, credits, earned_credits, category, nature, assessment,
        status, form, score, grade_point, minor, note, components)
       VALUES (@semester, @courseCode, @courseName, @credits, @earnedCredits, @category, @nature,
        @assessment, @status, @form, @score, @gradePoint, @minor, @note, @components)`,
    );
    db.transaction(() => {
      db.prepare('DELETE FROM grades_records').run();
      for (const record of records)
        insert.run({
          ...record,
          minor: record.minor ? 1 : 0,
          components: record.components ? JSON.stringify(record.components) : null,
        });
      db.prepare(
        `INSERT INTO grades_sync (id, last_synced_at, summary) VALUES (1, ?, ?)
         ON CONFLICT(id) DO UPDATE SET last_synced_at = excluded.last_synced_at,
           summary = excluded.summary`,
      ).run(new Date().toISOString(), summary ? JSON.stringify(summary) : null);
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

export function listGrades(): GradeRecord[] {
  const rows = hostPorts()
    .database()
    .prepare('SELECT * FROM grades_records ORDER BY semester DESC, course_code')
    .all() as GradeRow[];
  return rows.map((row) => ({
    semester: row.semester,
    courseCode: row.course_code,
    courseName: row.course_name,
    credits: row.credits,
    earnedCredits: row.earned_credits,
    category: row.category,
    nature: row.nature,
    assessment: row.assessment,
    status: row.status,
    form: row.form,
    score: row.score,
    gradePoint: row.grade_point,
    minor: row.minor === 1,
    note: row.note,
    components: row.components ? (JSON.parse(row.components) as GradeRecord['components']) : null,
  }));
}

export function getGradesState(): GradesState {
  const row = hostPorts()
    .database()
    .prepare('SELECT last_synced_at, summary FROM grades_sync WHERE id = 1')
    .get() as { last_synced_at: string; summary: string | null } | undefined;
  return {
    lastSyncedAt: row?.last_synced_at ?? null,
    summary: row?.summary ? (JSON.parse(row.summary) as GradeSummary) : null,
  };
}
