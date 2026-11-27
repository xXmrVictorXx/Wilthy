import type { CommandDomain } from '../../../../core/capabilities/commands';
import skill from './skill/SKILL.md?raw';
import requirements from './skill/requirements.md?raw';
import { queryProgramTool } from './query-program';
import { saveProgramRequirementsTool } from './save-requirements';

export const programDomain = {
  name: 'program',
  description: '查询培养方案进度，填写培养方案文件里的要求学分',
  skill: {
    name: 'program',
    files: [
      { path: 'SKILL.md', content: skill },
      { path: 'requirements.md', content: requirements },
    ],
  },
  commands: {
    query_program: queryProgramTool,
    save_program_requirements: saveProgramRequirementsTool,
  },
} satisfies CommandDomain;
