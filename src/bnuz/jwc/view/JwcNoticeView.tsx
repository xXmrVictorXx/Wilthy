import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, ExternalLink, FileText, Paperclip } from 'lucide-react';
import type { Navigate } from '../../../app/module';
import { createClient, errorMessage } from '../../../core/protocol/contract';
import { Button } from '../../../ui/button';
import { HtmlFrame } from '../../../ui/html-frame';
import { jwcContract } from '../contract';
import { Spinner } from '../../../ui/spinner';

const jwcClient = createClient(jwcContract, window.wilthy?.bridge);

export function JwcNoticeView({
  target: { noticeId },
  navigate,
}: {
  target: { noticeId: string };
  navigate: Navigate;
}) {
  const query = useQuery({
    queryKey: ['jwc', 'notice', noticeId],
    queryFn: () => jwcClient.notice(noticeId),
  });
  const notice = query.data;
  const attachmentsRef = useRef<HTMLElement>(null);
  return (
    <div className="mx-auto h-full w-full max-w-4xl overflow-y-auto px-6 py-6 [scrollbar-width:none] max-md:px-4">
      <header>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Button size="sm" variant="ghost" onClick={() => navigate({ page: 'notifications' })}>
            <ArrowLeft className="size-4" />
            返回通知
          </Button>
          {notice && (
            <Button size="sm" variant="ghost" onClick={() => window.open(notice.url)}>
              <ExternalLink className="size-4" />
              查看原文
            </Button>
          )}
        </div>
        <h1 className="break-words text-xl font-semibold">{notice?.title}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-sm text-ink-3">
          <span>教务部</span>
          {notice && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {new Date(notice.publishedAt).toLocaleDateString('zh-CN', {
                  timeZone: 'Asia/Shanghai',
                })}
              </span>
            </>
          )}
          {notice && notice.attachments.length > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-chip outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                onClick={() =>
                  attachmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              >
                <Paperclip className="size-3.5" />
                {notice.attachments.length} 个附件
              </button>
            </>
          )}
        </p>
      </header>
      {query.error ? (
        <div role="alert" className="py-6 text-sm text-danger">
          <p>{errorMessage(query.error)}</p>
          <Button className="mt-3" variant="outline" onClick={() => void query.refetch()}>
            重试
          </Button>
        </div>
      ) : !notice ? (
        <p role="status" className="flex items-center gap-2 py-6 text-sm text-ink-3">
          <Spinner />
          正在读取通知…
        </p>
      ) : (
        <>
          {notice.documents.map((document) => (
            <button
              key={document.sourceId}
              type="button"
              className="mt-5 flex w-full items-center gap-3 rounded-card border border-line bg-paper px-4 py-3 text-left text-sm outline-none transition-colors hover:bg-inset focus-visible:outline-2 focus-visible:outline-accent"
              onClick={() => navigate({ page: 'sources', sourceId: document.sourceId })}
            >
              <FileText className="size-5 shrink-0 text-ink-3" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">正文是 PDF 文件</span>
                <span className="block text-xs text-ink-3">点击在 Wilthy 中阅读</span>
              </span>
            </button>
          ))}
          <HtmlFrame
            baseUrl={notice.url}
            className="mt-5 overflow-hidden rounded-card bg-paper"
            html={notice.html}
            onLink={(url) => window.open(url)}
            title="教务部通知正文"
          />
          {notice.attachments.length > 0 && (
            <section
              ref={attachmentsRef}
              aria-label="相关附件"
              className="mt-6 scroll-mt-6 border-t border-line pt-4"
            >
              <h2 className="text-sm font-medium text-ink-3">附件</h2>
              <ul className="-mx-2 mt-1">
                {notice.attachments.map((file) => (
                  <li key={file.id}>
                    <button
                      type="button"
                      className="group flex w-full items-start gap-2 rounded-control px-2 py-1.5 text-left text-sm text-ink-2 outline-none transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
                      onClick={() =>
                        file.sourceId
                          ? navigate({ page: 'sources', sourceId: file.sourceId })
                          : window.open(file.url)
                      }
                    >
                      <Paperclip className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                      <span className="min-w-0 flex-1 break-words group-hover:underline group-hover:underline-offset-2">
                        {file.name}
                      </span>
                      <Download className="mt-0.5 size-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
