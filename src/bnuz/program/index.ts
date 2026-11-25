// 培养方案：从教务系统同步计划课程与「学业成绩与培养方案对比」，只读。
import type { WebContents } from 'electron';
import { defineModule } from '../../app/module';
import { registerCommandDomain } from '../../core/capabilities/commands';
import { hostPorts } from '../../core/ports';
import { implement } from '../../core/protocol/contract';
import { openJwxtLoginWindow } from '../campus';
import { programContract } from './contract';
import { programSchema } from './data/schema';
import { programDomain } from './main/agent';
import { getProgramState, listPlan, listProgress, syncProgram } from './main/api';

export const programModule = defineModule({
  id: 'program',
  schema: programSchema,
  ipc: implement(programContract, {
    state: getProgramState,
    plan: listPlan,
    progress: listProgress,
    sync: syncProgram,
    // 契约调用只来自工作区窗口，登录窗以它为父窗口。
    connect: () => openJwxtLoginWindow(hostPorts().workspaceClient() as WebContents),
  }),
  register() {
    registerCommandDomain(programDomain);
  },
});
