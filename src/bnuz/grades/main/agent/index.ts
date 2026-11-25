import type { CommandDomain } from '../../../../core/capabilities/commands';
import skill from './skill/SKILL.md?raw';
import { queryGradesTool } from './query-grades';

export const gradesDomain = {
  name: 'grades',
  description: '查询成绩',
  skill: { name: 'grades', files: [{ path: 'SKILL.md', content: skill }] },
  commands: {
    query_grades: queryGradesTool,
  },
} satisfies CommandDomain;
