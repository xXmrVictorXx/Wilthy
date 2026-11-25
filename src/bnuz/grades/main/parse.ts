import { load } from 'cheerio';
import type { GradeComponents, GradeRecord, GradeSummary } from '../contract';

const TERMS: Record<string, string> = { 秋季: '1', 春季: '2', 夏季: '3' };

export function semesterFromText(text: string): string | null {
  const match = /^(\d{4})-(\d{4})学年(秋季|春季|夏季)学期$/.exec(text.trim());
  return match ? `${match[1]}-${match[2]}-${TERMS[match[3]!]}` : null;
}

function tables(html: string): string[][][] {
  const $ = load(html);
  return $('table')
    .toArray()
    .map((table) =>
      $(table)
        .find('tr')
        .toArray()
        .map((row) =>
          $(row)
            .children('td, th')
            .toArray()
            .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim()),
        ),
    );
}

function course(text: string): { code: string; name: string } | null {
  const match = /^\[([^\]]+)\](.+)$/.exec(text);
  return match ? { code: match[1]!, name: match[2]!.trim() } : null;
}

function number(text: string | undefined): number | null {
  const value = Number(text);
  return text && Number.isFinite(value) ? value : null;
}

export function parseValidGrades(html: string): {
  records: GradeRecord[];
  summary: GradeSummary | null;
} {
  const all = tables(html);
  const rows = all.find((table) => table[0]?.[0] === '学年学期');
  if (!rows) throw new Error('成绩返回了无法识别的页面');
  const records = rows.slice(1).flatMap((cells): GradeRecord[] => {
    const semester = semesterFromText(cells[0] ?? '');
    const parsed = course(cells[1] ?? '');
    if (!semester || !parsed) return [];
    return [
      {
        semester,
        courseCode: parsed.code,
        courseName: parsed.name,
        credits: number(cells[2]) ?? 0,
        earnedCredits: number(cells[3]),
        category: cells[4] ?? '',
        nature: cells[5] ?? '',
        assessment: cells[6] ?? '',
        status: cells[7] ?? '',
        form: cells[8] ?? '',
        score: cells[9] ?? '',
        gradePoint: number(cells[10]),
        minor: (cells[11] ?? '主修') !== '主修',
        note: cells[12] || null,
        components: null,
      },
    ];
  });
  const totals = all.find((table) => table[0]?.[0] === '合计')?.[1]?.map(number);
  const summary =
    totals && totals.length >= 4 && totals.every((value) => value !== null)
      ? {
          attemptedCredits: totals[0]!,
          earnedCredits: totals[1]!,
          gpaCredits: totals[2]!,
          gpa: totals[3]!,
        }
      : null;
  return { records, summary };
}

export function parseRawGrades(html: string): Map<string, GradeComponents> {
  if (html.includes('没有检索到记录')) throw new Error('原始成绩为空，可能是登录或口令失效');
  const rows = tables(html).find((table) => table[0]?.[0] === '学年学期');
  if (!rows) throw new Error('原始成绩返回了无法识别的页面');
  const components = new Map<string, GradeComponents>();
  let semester: string | null = null;
  for (const cells of rows) {
    if (cells.length < 14) continue;
    semester = semesterFromText(cells[0]!) ?? semester;
    const parsed = course(cells[1]!);
    if (!semester || !parsed) continue;
    components.set(`${semester}|${parsed.code}`, {
      process: cells[7] || null,
      skill: cells[8] || null,
      midterm: cells[9] || null,
      final: cells[10] || null,
    });
  }
  return components;
}
