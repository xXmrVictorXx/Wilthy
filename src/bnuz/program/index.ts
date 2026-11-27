// 培养方案：从教务系统同步计划课程与「学业成绩与培养方案对比」；各类别要求学分由用户填写，
// 或由 Agent 从用户的培养方案文件读出，已获与在修学分按成绩和本学期课表实时统计。
import type { WebContents } from 'electron';
import { defineModule } from '../../app/module';
import { registerCommandDomain } from '../../core/capabilities/commands';
import { hostPorts } from '../../core/ports';
import { implement } from '../../core/protocol/contract';
import { openJwxtLoginWindow } from '../campus';
import { programContract } from './contract';
import { programSchema } from './data/schema';
import { programDomain } from './main/agent';
import {
  getOverview,
  getProgramState,
  listPlan,
  syncProgram,
  writeRequirements,
  writeTotal,
} from './main/api';

export const programModule = defineModule({
  id: 'program',
  schema: programSchema,
  ipc: implement(programContract, {
    state: getProgramState,
    plan: listPlan,
    overview: getOverview,
    setRequirement: ({ category, credits }) => writeRequirements([{ category, credits }], 'user'),
    setTotal: (credits) => writeTotal(credits, 'user'),
    sync: syncProgram,
    // 契约调用只来自工作区窗口，登录窗以它为父窗口。
    connect: () => openJwxtLoginWindow(hostPorts().workspaceClient() as WebContents),
  }),
  register() {
    registerCommandDomain(programDomain);
  },
});
