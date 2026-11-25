import { ListChecks } from 'lucide-react';
import { defineView } from '../../../app/module';
import { ProgramView } from './ProgramView';

export const programView = defineView({
  pages: { program: { component: ProgramView, nav: { label: '培养方案', icon: ListChecks } } },
});
