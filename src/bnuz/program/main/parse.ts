import { load } from 'cheerio';
import type { ModuleCourse, PlannedCourse } from '../contract';

const TERMS: Record<string, string> = { 秋季: '1', 春季: '2', 夏季: '3' };

function semesterFromText(text: string): string | null {
  const match = /^(\d{4})-(\d{4})学年(秋季|春季|夏季)学期$/.exec(text.trim());
  return match ? `${match[1]}-${match[2]}-${TERMS[match[3]!]}` : null;
}

export function parseDataTable(html: string, tableId: string): string[][] {
  const $ = load(html);
  const rows = $('table#keywords tr')
    .toArray()
    .map((row) =>
      $(row)
        .children('td, th')
        .toArray()
        .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim()),
    )
    .slice(1);
  const declared = [...html.matchAll(/showTotalRecord\('(\w+)','(\d+)'\)/g)].find(
    (match) => match[1] === tableId,
  )?.[2];
  if (declared === undefined || Number(declared) !== rows.length)
    throw new Error('培养方案表格条数不一致');
  return rows;
}

function fillDown(rows: string[][], column: number): string[][] {
  let last = '';
  return rows.map((cells) => {
    last = cells[column] || last;
    return cells.with(column, last);
  });
}

export function planFromRows(rows: string[][]): PlannedCourse[] {
  return fillDown(rows, 1).flatMap((cells) => {
    const semester = semesterFromText(cells[1] ?? '');
    const course = /^\[([^\]]+)\](.+)$/.exec(cells[2] ?? '');
    if (!semester || !course) return [];
    return [
      {
        semester,
        courseCode: course[1]!,
        courseName: course[2]!.trim(),
        credits: Number(cells[3]) || 0,
        category: cells[4] ?? '',
        assessment: cells[5] ?? '',
        hours: Number(cells[6]) || 0,
      },
    ];
  });
}

export function progressFromRows(rows: string[][]): ModuleCourse[] {
  return fillDown(rows, 0).flatMap((cells) =>
    cells[0] && cells[1]
      ? [
          {
            module: cells[0],
            courseCode: cells[1],
            courseName: cells[2] ?? '',
            credits: Number(cells[3]) || 0,
            hours: Number(cells[4]) || 0,
            term: cells[5] ?? '',
            score: cells[6] || null,
            selected: Boolean(cells[7]),
          },
        ]
      : [],
  );
}
