import type { QueryClient } from '@tanstack/react-query';
import { GraduationCap } from 'lucide-react';
import { defineView } from '../../../app/module';
import type { NotificationState } from '../../../modules/notifications/contract';
import { JWC_FILE_PREFIX, JWC_NOTICE_PREFIX, type JwcNotice } from '../contract';
import { JwcNoticeHeader } from './JwcNoticeHeader';

function title(sourceId: string, client: QueryClient): string | undefined {
  if (sourceId.startsWith(JWC_FILE_PREFIX))
    return decodeURIComponent(sourceId.split('#')[1] ?? '') || undefined;
  const noticeId = `jwc:${sourceId.slice(JWC_NOTICE_PREFIX.length)}`;
  return (
    client.getQueryData<JwcNotice>(['jwc', 'notice', noticeId])?.title ??
    client
      .getQueryData<NotificationState>(['notifications', 'state'])
      ?.items.find((item) => item.id === noticeId)?.title
  );
}

export const jwcView = defineView({
  pages: {},
  notices: { jwc: { label: '教务部', icon: GraduationCap } },
  // 通知（jwc-notice:）与其中的 PDF 文件（jwc-file:）共用一个前缀。
  sources: { prefix: 'jwc-', icon: GraduationCap, header: JwcNoticeHeader, title },
});
