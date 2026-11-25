import { describe, expect, it } from 'vitest';
import { semesterRange } from '../../contract';

describe('semesterRange', () => {
  it('从入学学年的秋季学期列到当前学期，最近的在前', () => {
    expect(semesterRange(2025, '2026-2027-1')).toEqual([
      '2026-2027-1',
      '2025-2026-3',
      '2025-2026-2',
      '2025-2026-1',
    ]);
  });

  it('不知道入学年份时只列当前学期', () => {
    expect(semesterRange(null, '2026-2027-1')).toEqual(['2026-2027-1']);
  });
});
