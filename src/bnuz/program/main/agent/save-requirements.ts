import { z } from 'zod';
import { tool } from '../../../../core/capabilities/domain-tools';
import { getOverview, writeRequirements, writeTotal } from '../api';

const credits = z.number().min(0).max(400);

const saveRequirementsInput = z
  .object({
    totalCredits: credits.optional(),
    categories: z
      .array(
        z
          .object({
            category: z.string().trim().min(1).max(100),
            credits,
            note: z.string().trim().max(500).nullable().default(null),
          })
          .strict(),
      )
      .max(80)
      .refine(
        (items) => new Set(items.map((item) => item.category)).size === items.length,
        '类别不能重复',
      )
      .default([]),
    overwrite: z.boolean().default(false),
  })
  .strict();

export const saveProgramRequirementsTool = tool(
  '把用户培养方案文件里的毕业总学分与各类别要求学分填进培养方案页面（本地写，按类别合并，不传的类别保持不变）。category 写成「课程模块/课程类别」，与 query_program 列出的类别一致；note 记指定课程、门数、限选等附加条件。用户自己填过的值默认不覆盖，出现在 skipped 里；征得用户同意后才传 overwrite=true 覆盖。',
  saveRequirementsInput,
  (input) => {
    const before = getOverview();
    const userFilled = new Map(
      before.categories.flatMap(({ requirement }) =>
        requirement?.filledBy === 'user' ? [[requirement.category, requirement.credits]] : [],
      ),
    );
    const keeps = (current: number | undefined, proposed: number) =>
      !input.overwrite && current !== undefined && current !== proposed;
    const skipped = [
      ...(input.totalCredits !== undefined &&
      before.total?.filledBy === 'user' &&
      keeps(before.total.credits, input.totalCredits)
        ? [{ category: '毕业总学分', current: before.total.credits, proposed: input.totalCredits }]
        : []),
      ...input.categories
        .filter((item) => keeps(userFilled.get(item.category), item.credits))
        .map((item) => ({
          category: item.category,
          current: userFilled.get(item.category)!,
          proposed: item.credits,
        })),
    ];
    // 用户填过的值即使和文件一致也不改写，保留「用户填写」的标记。
    if (input.totalCredits !== undefined && (input.overwrite || before.total?.filledBy !== 'user'))
      writeTotal(input.totalCredits, 'agent');
    const overview = writeRequirements(
      input.categories.filter((item) => input.overwrite || !userFilled.has(item.category)),
      'agent',
    );
    const known = new Set(before.categories.map(({ category }) => category));
    const unknown = input.categories
      .map(({ category }) => category)
      .filter((category) => !known.has(category));
    return {
      total: overview.total,
      categories: overview.categories.map(({ category, requirement }) => ({
        category,
        requirement,
      })),
      skipped,
      warnings: unknown.length
        ? [
            `成绩、课表与培养方案里都没有这些类别：${unknown.join('、')}。还没开始修的类别可以忽略，否则核对写法后重新保存`,
          ]
        : [],
    };
  },
);
