import { z } from 'zod';
import { coverage, freshness, match, tool } from '../../../../core/capabilities/domain-tools';
import { getGradesState, listGrades } from '../api';

const queryGradesInput = z
  .object({
    semester: z
      .string()
      .regex(/^\d{4}-\d{4}-[123]$/)
      .optional(),
    course: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const queryGradesTool = tool(
  '查询本地缓存的成绩（有效成绩，含原始分项）。semester 可选（YYYY-YYYY-[123]，1 秋 2 春 3 夏）；course 按课程名或课程号模糊匹配。summary 是教务系统给出的修读学分、获得学分与平均学分绩（GPA），以学校口径为准。',
  queryGradesInput,
  (input) => {
    const state = getGradesState();
    const records = listGrades().filter(
      (record) =>
        (!input.semester || record.semester === input.semester) &&
        (!input.course ||
          match(record.courseName, input.course) ||
          match(record.courseCode, input.course)),
    );
    const synced = state.lastSyncedAt !== null;
    return {
      records,
      summary: state.summary,
      freshness: freshness('cached', state.lastSyncedAt),
      coverage: coverage(
        'cached_grades',
        synced,
        synced ? [] : ['成绩尚未同步，请提示用户到成绩页面点击同步'],
      ),
    };
  },
);
