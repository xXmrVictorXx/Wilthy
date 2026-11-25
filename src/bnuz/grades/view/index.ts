import { GraduationCap } from 'lucide-react';
import { defineView } from '../../../app/module';
import { GradesView } from './GradesView';

export const gradesView = defineView({
  pages: { grades: { component: GradesView, nav: { label: '成绩', icon: GraduationCap } } },
});
