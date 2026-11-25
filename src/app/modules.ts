import type { ModuleDefinition } from './module';
import { chatModule } from '../modules/chat';
import { mailModule } from '../modules/mail';
import { notificationsModule } from '../modules/notifications';
import { onboardingModule } from '../modules/onboarding';
import { previewModule } from '../modules/preview';
import { remotesModule } from '../modules/remotes';
import { searchModule } from '../modules/search';
import { settingsModule } from '../modules/settings';
import { terminalModule } from '../modules/terminal';
import { todoModule } from '../modules/todo';
import { updateModule } from '../modules/update';
import { workspaceModule } from '../modules/workspace';
import { gradesModule } from '../bnuz/grades';
import { jwcModule } from '../bnuz/jwc';
import { programModule } from '../bnuz/program';
import { timetableModule } from '../bnuz/timetable';

export const modules: ModuleDefinition[] = [
  workspaceModule,
  previewModule,
  remotesModule,
  terminalModule,
  chatModule,
  mailModule,
  settingsModule,
  updateModule,
  onboardingModule,
  searchModule,
  todoModule,
  notificationsModule,
  timetableModule,
  gradesModule,
  programModule,
  jwcModule,
];
