import { z } from 'zod';
import { coverage, freshness, match, tool } from '../../../../core/capabilities/domain-tools';
import { isPassingScore, summarizeModules } from '../../contract';
import { getProgramState, listProgress } from '../api';

const queryProgramInput = z
  .object({
    module: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const queryProgramTool = tool(
  '查询本地缓存的培养方案进度：按课程模块汇总已获学分与通过门数，并列出未通过或未修的课程。module 可选，按模块名模糊匹配（如「专业核心课」）。教务系统没有给出各模块应修学分，不要编造要求。',
  queryProgramInput,
  (input) => {
    const state = getProgramState();
    const courses = listProgress().filter(
      (course) => !input.module || match(course.module, input.module),
    );
    const synced = state.lastSyncedAt !== null;
    return {
      modules: summarizeModules(courses),
      remaining: courses.filter((course) => !isPassingScore(course.score)),
      freshness: freshness('cached', state.lastSyncedAt),
      coverage: coverage(
        'cached_program',
        synced,
        synced ? [] : ['培养方案尚未同步，请提示用户到培养方案页面点击同步'],
      ),
    };
  },
);
