// 成绩：从教务系统同步有效成绩与原始分项，只读；学分与 GPA 以学校汇总为准。
import { defineModule } from '../../app/module';
import { registerCommandDomain } from '../../core/capabilities/commands';
import { implement } from '../../core/protocol/contract';
import { gradesContract } from './contract';
import { gradesSchema } from './data/schema';
import { gradesDomain } from './main/agent';
import { getGradesState, listGrades, syncGrades } from './main/api';

export const gradesModule = defineModule({
  id: 'grades',
  schema: gradesSchema,
  ipc: implement(gradesContract, {
    state: getGradesState,
    list: listGrades,
    sync: syncGrades,
  }),
  register() {
    registerCommandDomain(gradesDomain);
  },
});
