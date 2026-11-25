import type { CommandDomain } from '../../../../core/capabilities/commands';
import skill from './skill/SKILL.md?raw';
import { queryProgramTool } from './query-program';

export const programDomain = {
  name: 'program',
  description: '查询培养方案进度',
  skill: { name: 'program', files: [{ path: 'SKILL.md', content: skill }] },
  commands: {
    query_program: queryProgramTool,
  },
} satisfies CommandDomain;
