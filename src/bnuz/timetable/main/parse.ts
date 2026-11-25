import { load } from 'cheerio';

export interface BnuzSlot {
  readonly weeksText: string;
  readonly weekNumbers: number[];
  /** 未排课的段落（如「6-12周(双) [ ]」）没有星期与节次。 */
  readonly weekday: number | null;
  readonly startPeriod: number;
  readonly endPeriod: number;
  readonly classroom: string | null;
}

export interface ParsedLesson {
  readonly semester: string;
  readonly sourceId: string;
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
  readonly weekNumbers: string;
  readonly credits: number | null;
  readonly note: string | null;
}

const WEEKDAYS: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7 };
const SLOT =
  /(\d[\d,-]*周(?:\([单双]\))?)\s*(?:([一二三四五六日天])\[(\d+)(?:-(\d+))?\]|\[\s*\])\s*([^,]*?)\s*(?=,\s*[\d,-]+周|$)/g;

export function parseWeekNumbers(value: string | undefined): number[] {
  if (!value) return [];
  const odd = /单/.test(value);
  const even = /双/.test(value);
  const result = new Set<number>();
  for (const part of value.replace(/[周()（）单双]/g, '').split(/[,，、]/)) {
    const numbers = part.match(/\d+/g)?.map(Number) ?? [];
    if (numbers.length === 0) continue;
    const start = numbers[0]!;
    const end = numbers[1] ?? start;
    for (let week = start; week <= end && week <= 30; week += 1) {
      if ((odd && week % 2 === 0) || (even && week % 2 === 1)) continue;
      result.add(week);
    }
  }
  return [...result].sort((a, b) => a - b);
}

export function parseBnuzSlots(text: string): BnuzSlot[] {
  return [...text.trim().matchAll(SLOT)].map(([, weeksText, day, start, end, place]) => ({
    weeksText: weeksText!,
    weekNumbers: parseWeekNumbers(weeksText),
    weekday: day ? WEEKDAYS[day]! : null,
    startPeriod: day ? Number(start) : 0,
    endPeriod: day ? Number(end ?? start) : 0,
    classroom: place?.replace(/\(\d+\)$/, '').trim() || null,
  }));
}

export function parseTimetableList(html: string, semester: string): ParsedLesson[] {
  const $ = load(html);
  const rows = $('tr')
    .toArray()
    .map((row) =>
      $(row)
        .children('td, th')
        .toArray()
        .map((cell) => $(cell).text().replace(/\s+/g, ' ').trim()),
    );
  const header = rows.findIndex((cells) => cells[0] === '[课程号]课程名');
  if (header < 0) throw new Error('课表返回了无法识别的页面');
  return rows.slice(header + 1).flatMap((cells) => {
    const course = /^\[([^\]]+)\](.+)$/.exec(cells[0] ?? '');
    if (!course) return [];
    const credits = Number(cells[2]);
    const sourceId = cells.at(-1) || `${course[1]}-${cells[3] ?? ''}`;
    return parseBnuzSlots(cells[5] ?? '').flatMap((slot, index) =>
      slot.weekday === null
        ? []
        : [
            {
              semester,
              sourceId: `${sourceId}#${index}`,
              courseCode: course[1]!,
              courseName: course[2]!.trim(),
              className: cells[3] || null,
              teacher: cells[4] || null,
              campus: null,
              classroom: slot.classroom,
              weekday: slot.weekday,
              startPeriod: slot.startPeriod,
              endPeriod: slot.endPeriod,
              periodsText:
                slot.startPeriod === slot.endPeriod
                  ? `第${slot.startPeriod}节`
                  : `第${slot.startPeriod}-${slot.endPeriod}节`,
              weeksText: slot.weeksText,
              weekNumbers: JSON.stringify(slot.weekNumbers),
              credits: Number.isFinite(credits) ? credits : null,
              note: cells[6] && cells[6] !== '初修' ? cells[6] : null,
            },
          ],
    );
  });
}
