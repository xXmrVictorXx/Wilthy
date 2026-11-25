import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Paperclip } from 'lucide-react';
import type { SourceDocumentProps } from '../../../app/module';
import { createClient } from '../../../core/protocol/contract';
import { Button } from '../../../ui/button';
import { JWC_NOTICE_PREFIX, jwcContract } from '../contract';

const jwcClient = createClient(jwcContract, window.wilthy?.bridge);

/** 通知预览标签的页眉：正文（PDF 或网页）由预览标签渲染，这里补上日期、原文与附件。 */
export function JwcNoticeHeader(props: SourceDocumentProps) {
  return props.sourceId.startsWith(JWC_NOTICE_PREFIX) ? <NoticeHeader {...props} /> : null;
}

function NoticeHeader({ sourceId, content, navigate }: SourceDocumentProps) {
  const noticeId = `jwc:${sourceId.slice(JWC_NOTICE_PREFIX.length)}`;
  const notice = useQuery({
    queryKey: ['jwc', 'notice', noticeId],
    queryFn: () => jwcClient.notice(noticeId),
  }).data;
  return (
    <header className="border-b border-line px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-base font-semibold">{content.title}</h1>
          {notice && (
            <p className="mt-1 text-xs text-ink-3">
              教务部 ·{' '}
              {new Date(notice.publishedAt).toLocaleDateString('zh-CN', {
                timeZone: 'Asia/Shanghai',
              })}
            </p>
          )}
        </div>
        {content.url && (
          <Button size="sm" variant="ghost" onClick={() => window.open(content.url)}>
            <ExternalLink className="size-4" />
            查看原文
          </Button>
        )}
      </div>
      {notice && notice.attachments.length > 0 && (
        <ul aria-label="附件" className="-mx-2 mt-2 flex flex-wrap gap-x-1">
          {notice.attachments.map((file) => (
            <li key={file.id}>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-control px-2 py-1 text-left text-xs text-ink-2 outline-none transition-colors hover:bg-inset hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                onClick={() =>
                  file.sourceId
                    ? navigate({ page: 'sources', sourceId: file.sourceId })
                    : window.open(file.url)
                }
              >
                <Paperclip className="size-3.5 shrink-0 text-ink-3" />
                <span className="break-words">{file.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
