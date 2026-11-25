import { describe, expect, it } from 'vitest';
import type { TimetableLesson } from '../../contract';
import { lessonOccurrences } from '../schedule';

const lesson: TimetableLesson = {
  id: 1,
  semester: '2026-2027-1',
  courseCode: 'C1',
  courseName: '课程',
  className: null,
  teacher: null,
  campus: null,
  classroom: '教室',
  weekday: 1,
  startPeriod: 1,
  endPeriod: 2,
  periodsText: '1-2',
  weeksText: '1,3',
  weekNumbers: [1, 3],
  credits: null,
  note: null,
};
describe('campus lesson dates', () => {
  it('expands explicit weeks in Shanghai time independent of the host timezone', () => {
    const result = lessonOccurrences(
      [lesson],
      '2026-09-14',
      '2026-09-13T00:00:00Z',
      '2026-10-01T00:00:00Z',
    );
    expect(result.items.map((item) => item.startAt)).toEqual([
      '2026-09-14T00:00:00.000Z',
      '2026-09-28T00:00:00.000Z',
    ]);
    expect(result.items[0]!.endAt).toBe('2026-09-14T01:40:00.000Z');
    expect(result.warnings).toEqual([]);
  });
  it('uses half-open overlap boundaries', () => {
    expect(
      lessonOccurrences([lesson], '2026-09-14', '2026-09-14T01:40:00Z', '2026-09-15T00:00:00Z')
        .items,
    ).toEqual([]);
  });
  it('第 12 周周三第 1–2 节对应 BNUZ 作息时间', () => {
    const result = lessonOccurrences(
      [{ ...lesson, weekday: 3, weekNumbers: [12] }],
      '2026-09-07',
      '2026-11-25T00:00:00+08:00',
      '2026-11-26T00:00:00+08:00',
    );
    expect(result.items.map((item) => [item.startAt, item.endAt])).toEqual([
      ['2026-11-25T00:00:00.000Z', '2026-11-25T01:40:00.000Z'],
    ]);
  });
  it('第 99 节是中午 11:50–13:20', () => {
    const result = lessonOccurrences(
      [{ ...lesson, startPeriod: 99, endPeriod: 99, weekNumbers: [1] }],
      '2026-09-07',
      '2026-09-07T00:00:00+08:00',
      '2026-09-08T00:00:00+08:00',
    );
    expect(result.items.map((item) => [item.startAt, item.endAt])).toEqual([
      ['2026-09-07T03:50:00.000Z', '2026-09-07T05:20:00.000Z'],
    ]);
  });
  it('does not invent dates for missing weeks or unsupported periods', () => {
    const result = lessonOccurrences(
      [
        { ...lesson, weekNumbers: [] },
        { ...lesson, endPeriod: 20 },
      ],
      '2026-09-14',
      '2026-09-01T00:00:00Z',
      '2026-10-01T00:00:00Z',
    );
    expect(result.items).toEqual([]);
    expect(result.warnings).toHaveLength(2);
  });
});
