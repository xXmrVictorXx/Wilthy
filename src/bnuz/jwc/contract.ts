import { z } from 'zod';
import { defineContract } from '../../core/protocol/contract';

export interface JwcNotice {
  id: string;
  title: string;
  publishedAt: string;
  url: string;
  html: string;
  /** 正文里内嵌的 PDF（教务部用 PDF 阅读器展示正文），在应用内的预览标签打开。 */
  documents: { name: string; sourceId: string }[];
  /** PDF 附件带 sourceId，可在应用内打开；其他格式交给浏览器下载。 */
  attachments: { id: string; name: string; url: string; sourceId: string | null }[];
}

export const JWC_FILE_PREFIX = 'jwc-file:';

const noticeId = z.string().regex(/^jwc:[0-9a-f]{32}$/);

export const jwcContract = defineContract('jwc', {
  notice: { input: noticeId, output: z.custom<JwcNotice>() },
});

declare module '../../app/module' {
  interface NavTargets {
    jwc: { noticeId: string };
  }
}
