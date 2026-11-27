import { z } from 'zod';
import { coverage, freshness, match, tool } from '../../../../core/capabilities/domain-tools';
import { getOverview, getProgramState } from '../api';

const queryProgramInput = z
  .object({
    category: z.string().trim().min(1).max(100).optional(),
  })
  .strict();

export const queryProgramTool = tool(
  '查询本地缓存的培养方案进度：按「课程模块/课程类别」列出要求学分（requirement，null 表示还没填写，不要编造）、已获学分（成绩里已通过）、在修学分（本学期课表里还没有成绩的课）与差额，并列出未通过、在修与方案内还没修的课程。category 可选，按类别名模糊匹配（如「专业核心课」）。已通过课程的明细用 query_grades 查。',
  queryProgramInput,
  (input) => {
    const state = getProgramState();
    const overview = getOverview();
    const synced = state.lastSyncedAt !== null;
    return {
      total: overview.total,
      earnedCredits: overview.earnedCredits,
      ongoingCredits: overview.ongoingCredits,
      categories: overview.categories
        .filter((item) => !input.category || match(item.category, input.category))
        .map(({ courses, ...item }) => ({
          ...item,
          gap: item.requirement
            ? Math.max(0, item.requirement.credits - item.earnedCredits - item.ongoingCredits)
            : null,
          remaining: courses.filter((course) => course.status !== 'passed'),
        })),
      freshness: freshness('cached', state.lastSyncedAt),
      coverage: coverage(
        'cached_program',
        synced,
        synced ? [] : ['培养方案尚未同步，请提示用户到培养方案页面点击同步'],
      ),
    };
  },
);
