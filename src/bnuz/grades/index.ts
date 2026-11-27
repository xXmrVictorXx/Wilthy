// 成绩：从教务系统同步有效成绩与原始分项，只读；学分与 GPA 以学校汇总为准。
import type { WebContents } from 'electron';
import { defineModule } from '../../app/module';
import { registerCommandDomain } from '../../core/capabilities/commands';
import { hostPorts } from '../../core/ports';
import { implement } from '../../core/protocol/contract';
import { openJwxtLoginWindow } from '../campus';
import { gradesContract } from './contract';
import { gradesSchema } from './data/schema';
import { gradesDomain } from './main/agent';
import { getGradesState, listGrades, syncGrades } from './main/api';

export { listGrades } from './main/api';

export const gradesModule = defineModule({
  id: 'grades',
  schema: gradesSchema,
  ipc: implement(gradesContract, {
    state: getGradesState,
    list: listGrades,
    sync: syncGrades,
    // 契约调用只来自工作区窗口，登录窗以它为父窗口。
    connect: () => openJwxtLoginWindow(hostPorts().workspaceClient() as WebContents),
  }),
  register() {
    registerCommandDomain(gradesDomain);
  },
});
