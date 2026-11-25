import { GraduationCap } from 'lucide-react';
import { defineView } from '../../../app/module';
import { JWC_FILE_PREFIX } from '../contract';
import { JwcNoticeHeader } from './JwcNoticeHeader';

export const jwcView = defineView({
  pages: {},
  notices: { jwc: { label: '教务部', icon: GraduationCap } },
  // 通知（jwc-notice:）与其中的 PDF 文件（jwc-file:）共用一个前缀。
  sources: {
    prefix: 'jwc-',
    icon: GraduationCap,
    document: JwcNoticeHeader,
    title: (sourceId: string) =>
      sourceId.startsWith(JWC_FILE_PREFIX)
        ? decodeURIComponent(sourceId.split('#')[1] ?? '') || undefined
        : undefined,
  },
});
