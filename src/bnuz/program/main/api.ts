import { emit, hostPorts } from '../../../core/ports';
import {
  CampusAuthError,
  currentTerm,
  flushCampusSession,
  jwxtRequest,
  toJwxtTerm,
} from '../../campus';
import { listGrades } from '../../grades';
import { currentSemester, listLessons } from '../../timetable';
import {
  buildOverview,
  programContract,
  type CreditRequirement,
  type FilledBy,
  type ModuleCourse,
  type PlannedCourse,
  type ProgramOverview,
  type ProgramResult,
  type ProgramState,
} from '../contract';
import { parseDataTable, planFromRows, progressFromRows } from './parse';

const PLAN_TABLE = '2508';
const PROGRESS_TABLE = '5327008';
const TERM_NAMES = ['秋季学期', '春季学期', '夏季学期'];

async function fetchProgram() {
  const { semester, studentId } = await currentTerm();
  const { xn, xn1, xq } = toJwxtTerm(semester);
  const plan = planFromRows(
    parseDataTable(
      await jwxtRequest(`/taglib/DataTable.jsp?tableId=${PLAN_TABLE}`, {
        form: { xh: studentId, menucode_current: 'JW130301' },
      }),
      PLAN_TABLE,
    ),
  );
  const progress = progressFromRows(
    parseDataTable(
      await jwxtRequest(`/taglib/DataTable.jsp?tableId=${PROGRESS_TABLE}`, {
        form: {
          xh: studentId,
          xn,
          xq_m: xq,
          xn1,
          _xq: TERM_NAMES[Number(xq)]!,
          ck_px: 'akcmk',
          menucode_current: 'JW130413',
        },
      }),
      PROGRESS_TABLE,
    ),
  );
  return { plan, progress };
}

export async function syncProgram(): Promise<ProgramResult> {
  try {
    const { plan, progress } = await fetchProgram();
    await flushCampusSession();
    const db = hostPorts().database();
    const insertPlan = db.prepare(
      `INSERT INTO program_plan (semester, course_code, course_name, credits, category, assessment, hours)
       VALUES (@semester, @courseCode, @courseName, @credits, @category, @assessment, @hours)`,
    );
    const insertProgress = db.prepare(
      `INSERT INTO program_progress (module, course_code, course_name, credits, hours, term, score, selected)
       VALUES (@module, @courseCode, @courseName, @credits, @hours, @term, @score, @selected)`,
    );
    db.transaction(() => {
      db.prepare('DELETE FROM program_plan').run();
      db.prepare('DELETE FROM program_progress').run();
      for (const course of plan) insertPlan.run(course);
      for (const course of progress)
        insertProgress.run({ ...course, selected: course.selected ? 1 : 0 });
      db.prepare(
        `INSERT INTO program_sync (id, last_synced_at) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET last_synced_at = excluded.last_synced_at`,
      ).run(new Date().toISOString());
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

export function listPlan(): PlannedCourse[] {
  return hostPorts()
    .database()
    .prepare(
      `SELECT semester, course_code AS courseCode, course_name AS courseName, credits, category,
        assessment, hours FROM program_plan ORDER BY id`,
    )
    .all() as PlannedCourse[];
}

export function listProgress(): ModuleCourse[] {
  const rows = hostPorts()
    .database()
    .prepare(
      `SELECT module, course_code AS courseCode, course_name AS courseName, credits, hours, term,
        score, selected FROM program_progress ORDER BY id`,
    )
    .all() as Array<Omit<ModuleCourse, 'selected'> & { selected: number }>;
  return rows.map((row) => ({ ...row, selected: row.selected === 1 }));
}

export function getProgramState(): ProgramState {
  const row = hostPorts()
    .database()
    .prepare('SELECT last_synced_at FROM program_sync WHERE id = 1')
    .get() as { last_synced_at: string } | undefined;
  return { lastSyncedAt: row?.last_synced_at ?? null };
}

export function listRequirements(): CreditRequirement[] {
  return hostPorts()
    .database()
    .prepare(
      'SELECT category, credits, note, filled_by AS filledBy FROM program_requirements ORDER BY rowid',
    )
    .all() as CreditRequirement[];
}

export function getOverview(): ProgramOverview {
  const total = hostPorts()
    .database()
    .prepare('SELECT credits, filled_by AS filledBy FROM program_total WHERE id = 1')
    .get() as ProgramOverview['total'] | undefined;
  return buildOverview({
    progress: listProgress(),
    plan: listPlan(),
    grades: listGrades(),
    ongoing: listLessons(currentSemester()),
    requirements: listRequirements(),
    total: total ?? null,
  });
}

/** 写入后推送给页面：Agent 填写时培养方案页面也跟着更新。 */
function publish(): ProgramOverview {
  const overview = getOverview();
  emit(programContract, 'overview', overview);
  return overview;
}

export function writeRequirements(
  items: readonly { category: string; credits: number | null; note?: string | null }[],
  filledBy: FilledBy,
): ProgramOverview {
  const db = hostPorts().database();
  const upsert = db.prepare(
    `INSERT INTO program_requirements (category, credits, note, filled_by) VALUES (?, ?, ?, ?)
     ON CONFLICT(category) DO UPDATE SET credits = excluded.credits,
       note = COALESCE(excluded.note, program_requirements.note), filled_by = excluded.filled_by`,
  );
  const remove = db.prepare('DELETE FROM program_requirements WHERE category = ?');
  db.transaction(() => {
    for (const item of items)
      if (item.credits === null) remove.run(item.category);
      else upsert.run(item.category, item.credits, item.note ?? null, filledBy);
  })();
  return publish();
}

export function writeTotal(credits: number | null, filledBy: FilledBy): ProgramOverview {
  const db = hostPorts().database();
  if (credits === null) db.prepare('DELETE FROM program_total WHERE id = 1').run();
  else
    db.prepare(
      `INSERT INTO program_total (id, credits, filled_by) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET credits = excluded.credits, filled_by = excluded.filled_by`,
    ).run(credits, filledBy);
  return publish();
}
